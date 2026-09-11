import type { SlateWebhookHttpResponseInit } from '../action';

export const graphWebhookHttp = {
  methods: ['POST'],
  sync: {
    mode: 'match',
    match: [{ hasQueryParam: 'validationToken' }]
  }
};

export let getGraphWebhookValidationResponse = (
  request: Request
): SlateWebhookHttpResponseInit | null => {
  let validationToken = new URL(request.url).searchParams.get('validationToken');
  if (validationToken === null) return null;

  return {
    status: 200,
    headers: { 'content-type': 'text/plain' },
    body: validationToken
  };
};
