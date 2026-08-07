import type { SlateWebhookHttpOptions, SlateWebhookHttpResponseInit } from '../action';

export const metaWebhookHttp = {
  methods: ['GET', 'POST'],
  sync: {
    mode: 'match',
    match: [{ method: 'GET', hasQueryParam: 'hub.mode' }]
  }
} satisfies SlateWebhookHttpOptions;

export let getMetaWebhookVerificationResponse = (
  request: Request,
  expectedVerifyToken: string | undefined
): SlateWebhookHttpResponseInit | null => {
  if (request.method !== 'GET') return null;

  let url = new URL(request.url);
  let mode = url.searchParams.get('hub.mode');
  let verifyToken = url.searchParams.get('hub.verify_token');
  let challenge = url.searchParams.get('hub.challenge');

  if (mode !== 'subscribe' || challenge === null) {
    return {
      status: 400,
      headers: { 'content-type': 'text/plain' },
      body: 'invalid webhook verification request'
    };
  }

  if (expectedVerifyToken !== undefined && verifyToken !== expectedVerifyToken) {
    return {
      status: 403,
      headers: { 'content-type': 'text/plain' },
      body: 'invalid verify token'
    };
  }

  return {
    status: 200,
    headers: { 'content-type': 'text/plain' },
    body: challenge
  };
};
