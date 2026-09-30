export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export type CorsHeaders = Record<string, string>;

export function jsonResponse(data: unknown, corsHeaders: CorsHeaders, status = 200): Response {
  return Response.json(data, { status, headers: corsHeaders });
}

export async function readJsonObject<T extends object = Record<string, unknown>>(request: Request): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, 'A JSON object body is required.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'A JSON object body is required.');
  }
  return body as T;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomToken(byteLength = 32): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

export function optionalTrimmedString(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new HttpError(400, `${field} must be ${maxLength} characters or fewer.`);
  return trimmed.length > 0 ? trimmed : null;
}

export function requiredTrimmedString(value: unknown, field: string, maxLength: number): string {
  const trimmed = optionalTrimmedString(value, field, maxLength);
  if (!trimmed) throw new HttpError(400, `${field} is required.`);
  return trimmed;
}

export function parseLatitude(value: unknown, field = 'Latitude'): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < -90 || value > 90) {
    throw new HttpError(400, `${field} must be a number between -90 and 90.`);
  }
  return value;
}

export function parseLongitude(value: unknown, field = 'Longitude'): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < -180 || value > 180) {
    throw new HttpError(400, `${field} must be a number between -180 and 180.`);
  }
  return value;
}

export function optionalFiniteNumber(value: unknown, field: string, min: number, max: number): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new HttpError(400, `${field} must be a number between ${min} and ${max}.`);
  }
  return value;
}
