declare namespace Cloudflare {
  interface Env {
    /** Firebase service-account JSON used to send FCM HTTP v1 messages. */
    FCM_SERVICE_ACCOUNT_JSON?: string;
    /** OpenRouteService API key used for travel-time estimates. */
    ORS_API_KEY?: string;
    /** Optional contact email sent to Nominatim with venue searches. */
    NOMINATIM_EMAIL?: string;
  }
}
