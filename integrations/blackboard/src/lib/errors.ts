import { buildApiServiceError } from 'slates';

export let blackboardApiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Blackboard Learn',
    reason: 'blackboard_api_error',
    detailKeys: [
      'message',
      'developerMessage',
      'extraInfo',
      'error_description',
      'error',
      'code'
    ],
    nestedKeys: ['errors'],
    extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
    extractUpstreamCode: (_error, response, helpers) => {
      let body = response?.data;
      return helpers.isRecord(body) &&
        (typeof body.code === 'string' || typeof body.code === 'number')
        ? String(body.code)
        : undefined;
    }
  });
