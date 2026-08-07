import { createHmacSignature, type SlateWebhookHttpOptions } from '@slates/provider';

export const zoomWebhookHttp = {
  methods: ['POST'],
  sync: {
    mode: 'match',
    match: [
      {
        jsonBodyField: {
          path: 'event',
          equals: 'endpoint.url_validation'
        }
      }
    ]
  }
} satisfies SlateWebhookHttpOptions;

export let createZoomUrlValidationResult = (
  plainToken: unknown,
  secretToken: string | undefined
) => {
  if (typeof plainToken !== 'string' || plainToken.length === 0) {
    return {
      inputs: [],
      response: {
        status: 400,
        headers: { 'content-type': 'text/plain' },
        body: 'invalid Zoom URL validation request'
      }
    };
  }

  if (!secretToken) {
    return {
      inputs: [],
      response: {
        status: 500,
        headers: { 'content-type': 'text/plain' },
        body: 'Zoom webhook Secret Token is not configured'
      }
    };
  }

  return {
    inputs: [],
    response: {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        plainToken,
        encryptedToken: createHmacSignature({
          secret: secretToken,
          payload: plainToken,
          digest: 'hex'
        })
      })
    }
  };
};
