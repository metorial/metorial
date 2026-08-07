import { describe, expect, it } from 'vitest';
import { getGraphWebhookValidationResponse, graphWebhookHttp } from './graph';

describe('Microsoft Graph webhook validation', () => {
  it('makes only validation requests synchronous', () => {
    expect(graphWebhookHttp).toEqual({
      methods: ['POST'],
      sync: {
        mode: 'match',
        match: [{ hasQueryParam: 'validationToken' }]
      }
    });
  });

  it('echoes the URL-decoded validation token as plain text', () => {
    let response = getGraphWebhookValidationResponse(
      new Request(
        'https://example.com/webhook?validationToken=Validation%3a+Testing+client+application+reachability',
        { method: 'POST' }
      )
    );

    expect(response).toEqual({
      status: 200,
      headers: { 'content-type': 'text/plain' },
      body: 'Validation: Testing client application reachability'
    });
  });

  it('ignores ordinary change notifications', () => {
    expect(
      getGraphWebhookValidationResponse(
        new Request('https://example.com/webhook', { method: 'POST' })
      )
    ).toBeNull();
  });
});
