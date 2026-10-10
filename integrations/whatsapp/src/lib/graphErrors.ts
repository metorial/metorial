import { buildApiServiceError, type SlateAxiosErrorOptions, SlateError } from 'slates';

// Keep the numeric Graph `code` as upstream code; axios inference keeps only string codes.
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

export let getWhatsAppGraphErrorCode = (error: unknown) => {
  let code = SlateError.is(error) ? error.data.upstream?.code : undefined;
  return typeof code === 'string' && code ? code : undefined;
};

export let toWhatsAppServiceError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'WhatsApp',
    reason: 'whatsapp_api_error',
    operation,
    extractUpstreamCode: getWhatsAppGraphErrorCode
  });
