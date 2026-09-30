import { base64UrlEncode } from './http';

export interface PushTarget {
  deviceId: string;
  platform: string;
  pushToken: string;
  playerId: string | null;
}

export interface PushNotification {
  type: 'game_invite' | 'game_updated' | 'game_cancelled' | 'game_nudge' | 'alarm_reminder' | 'maybe_reminder';
  title: string;
  body: string;
  groupId: number;
  gameDayId: string;
  route: string;
  /** iOS notification category / Android action set. */
  category?: 'GAME_INVITE';
  /** Omit the reply actions for devices that have not claimed a roster player yet. */
  actionsRequireClaim?: boolean;
  /** Wakes the iOS app in the background so it can remove a cancelled game's alarm. */
  contentAvailable?: boolean;
}

export interface PushResult {
  attempted: number;
  sent: number;
  failed: number;
  removedTokens: number;
  skipped?: 'not-configured';
}

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token';
const SEND_BATCH_SIZE = 10;

let cachedAccessToken: { clientEmail: string; token: string; expiresAt: number } | null = null;

export function resetPushStateForTests(): void {
  cachedAccessToken = null;
}

export function parseServiceAccount(raw: string | undefined): ServiceAccount | null {
  if (!raw) return null;
  try {
    const account = JSON.parse(raw) as Partial<ServiceAccount>;
    if (
      typeof account.project_id === 'string' && account.project_id
      && typeof account.client_email === 'string' && account.client_email
      && typeof account.private_key === 'string' && account.private_key.includes('PRIVATE KEY')
    ) {
      return account as ServiceAccount;
    }
  } catch (error) {
    console.error('FCM_SERVICE_ACCOUNT_JSON is not valid JSON.', error);
  }
  return null;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

async function createSignedJwt(account: ServiceAccount, issuedAtSeconds: number): Promise<string> {
  const encode = (value: object) => base64UrlEncode(new TextEncoder().encode(JSON.stringify(value)));
  const unsignedToken = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: account.client_email,
    scope: FCM_SCOPE,
    aud: account.token_uri || DEFAULT_TOKEN_URI,
    iat: issuedAtSeconds,
    exp: issuedAtSeconds + 3600
  })}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    await importPrivateKey(account.private_key),
    new TextEncoder().encode(unsignedToken)
  );
  return `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function getAccessToken(account: ServiceAccount): Promise<string> {
  const now = Date.now();
  if (
    cachedAccessToken
    && cachedAccessToken.clientEmail === account.client_email
    && cachedAccessToken.expiresAt - 60_000 > now
  ) {
    return cachedAccessToken.token;
  }

  const response = await fetch(account.token_uri || DEFAULT_TOKEN_URI, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await createSignedJwt(account, Math.floor(now / 1000))
    }).toString()
  });
  if (!response.ok) {
    throw new Error(`FCM access-token request failed with HTTP ${response.status}.`);
  }
  const payload = await response.json() as { access_token?: string; expires_in?: number };
  if (!payload.access_token) {
    throw new Error('FCM access-token response did not include an access token.');
  }
  cachedAccessToken = {
    clientEmail: account.client_email,
    token: payload.access_token,
    expiresAt: now + (payload.expires_in ?? 3600) * 1000
  };
  return payload.access_token;
}

export function buildFcmMessage(target: PushTarget, notification: PushNotification): Record<string, unknown> {
  const showActions = Boolean(notification.category) && !(notification.actionsRequireClaim && !target.playerId);
  const data: Record<string, string> = {
    type: notification.type,
    title: notification.title,
    body: notification.body,
    groupId: String(notification.groupId),
    gameDayId: notification.gameDayId,
    route: notification.route,
    category: showActions ? notification.category ?? '' : ''
  };

  if (target.platform === 'ios') {
    const aps: Record<string, unknown> = {
      alert: { title: notification.title, body: notification.body },
      sound: 'default',
      'thread-id': `game-${notification.gameDayId}`
    };
    if (showActions) aps.category = notification.category;
    if (notification.contentAvailable) aps['content-available'] = 1;
    return {
      message: {
        token: target.pushToken,
        data,
        apns: {
          headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
          payload: { aps }
        }
      }
    };
  }

  // Android receives data-only messages so the app can render reply actions itself.
  return {
    message: {
      token: target.pushToken,
      data,
      android: { priority: 'HIGH', ttl: '86400s' }
    }
  };
}

function isStaleTokenError(status: number, errorText: string): boolean {
  return status === 404
    || /UNREGISTERED|SENDER_ID_MISMATCH/.test(errorText)
    || (status === 400 && /registration token/i.test(errorText));
}

export async function sendPush(env: Env, targets: PushTarget[], notification: PushNotification): Promise<PushResult> {
  const deliverable = targets.filter(target =>
    Boolean(target.pushToken) && (target.platform === 'android' || target.platform === 'ios')
  );
  const account = parseServiceAccount(env.FCM_SERVICE_ACCOUNT_JSON);
  if (!account) {
    return { attempted: deliverable.length, sent: 0, failed: 0, removedTokens: 0, skipped: 'not-configured' };
  }
  if (deliverable.length === 0) {
    return { attempted: 0, sent: 0, failed: 0, removedTokens: 0 };
  }

  const accessToken = await getAccessToken(account);
  const endpoint = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`;
  const staleTokens: string[] = [];
  let sent = 0;
  let failed = 0;

  for (let index = 0; index < deliverable.length; index += SEND_BATCH_SIZE) {
    const batch = deliverable.slice(index, index + SEND_BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(async target => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildFcmMessage(target, notification))
      });
      if (response.ok) return 'sent';
      const errorText = await response.text();
      if (isStaleTokenError(response.status, errorText)) return 'stale';
      throw new Error(`FCM send failed with HTTP ${response.status}: ${errorText.slice(0, 300)}`);
    }));
    results.forEach((result, resultIndex) => {
      if (result.status === 'fulfilled' && result.value === 'sent') {
        sent++;
      } else if (result.status === 'fulfilled') {
        staleTokens.push(batch[resultIndex].pushToken);
      } else {
        failed++;
        console.warn(result.reason);
      }
    });
  }

  if (staleTokens.length > 0) {
    await env.cricket_mgr.prepare(
      `UPDATE group_devices SET push_token = NULL WHERE push_token IN (${staleTokens.map(() => '?').join(', ')})`
    ).bind(...staleTokens).run();
  }

  return { attempted: deliverable.length, sent, failed, removedTokens: staleTokens.length };
}
