import { describe, expect, it } from 'vitest';
import { generateChallengeResponse, verifyAndParseWebhook } from './webhook';
import { braintreeTestCredentials, signedBraintreeSample } from './webhook-test-fixture';

describe('Braintree supported SDK webhook helper', () => {
  it('generates the exact challenge response through the SDK', () => {
    let response = generateChallengeResponse(braintreeTestCredentials, '0123456789abcdefabcd');
    expect(response).toMatch(/^public-key\|[a-f0-9]{40}$/);
  });

  it('parses an SDK-generated signed sample notification', async () => {
    let sample = await signedBraintreeSample();
    let notification = await verifyAndParseWebhook(
      braintreeTestCredentials,
      sample.bt_signature,
      sample.bt_payload
    );
    expect(notification.kind).toBe('check');
    expect(notification.subject).toBeTypeOf('object');
  });

  it('rejects a signature mismatch through the SDK', async () => {
    let sample = await signedBraintreeSample();
    await expect(
      verifyAndParseWebhook(
        braintreeTestCredentials,
        'public-key|0000000000000000000000000000000000000000',
        sample.bt_payload
      )
    ).rejects.toThrow(/signature/i);
  });
});
