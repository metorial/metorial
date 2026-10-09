import type { SlateAxiosErrorOptions } from 'slates';

/**
 * Graph API error body used by the WhatsApp Cloud API:
 * `{ error: { message, type, code, error_data: { details }, fbtrace_id } }`.
 * https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes
 *
 * The numeric `code` is the documented classification, so it is preserved as the
 * upstream code (the default axios inference only keeps string codes and would
 * otherwise record `OAuthException` from `type`).
 */
export let whatsappGraphErrorMapping: SlateAxiosErrorOptions = {
  mapAxiosError: error => {
    let data = error.response?.data as { error?: unknown } | undefined;
    let graphError = data?.error;
    if (!graphError || typeof graphError !== 'object') return undefined;

    let record = graphError as {
      message?: unknown;
      type?: unknown;
      code?: unknown;
      error_data?: { details?: unknown } | null;
      fbtrace_id?: unknown;
    };

    let code =
      typeof record.code === 'number' || typeof record.code === 'string'
        ? String(record.code)
        : undefined;
    let message = typeof record.message === 'string' ? record.message : undefined;
    let details =
      typeof record.error_data?.details === 'string' ? record.error_data.details : undefined;

    return {
      ...(message
        ? {
            message: details && !message.includes(details) ? `${message}: ${details}` : message
          }
        : {}),
      upstream: {
        ...(code ? { code } : {}),
        ...(typeof record.type === 'string' ? { type: record.type } : {}),
        ...(typeof record.fbtrace_id === 'string' ? { requestId: record.fbtrace_id } : {})
      }
    };
  }
};
