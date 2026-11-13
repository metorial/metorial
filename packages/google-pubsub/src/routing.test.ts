import { describe, expect, it } from 'vitest';
import { extractGooglePubSubRoutingKeys, googlePubSubRoutingKey } from './routing';

describe('Google Pub/Sub routing keys', () => {
  it('matches a mailbox notification to the key its registration returned', () => {
    expect(
      extractGooglePubSubRoutingKeys('gmail', {
        data: { emailAddress: 'User@Example.com', historyId: '42' },
        attributes: {}
      })
    ).toEqual([googlePubSubRoutingKey.gmail(' user@example.com ')]);
  });

  it('matches form, meeting and bucket notifications by their producer identity', () => {
    expect(
      extractGooglePubSubRoutingKeys('forms', {
        attributes: { formId: 'form-1', eventType: 'RESPONSES', watchId: 'watch-1' }
      })
    ).toEqual([googlePubSubRoutingKey.forms('form-1')]);
    expect(
      extractGooglePubSubRoutingKeys('meet', {
        attributes: { 'ce-source': '//workspaceevents.googleapis.com/subscriptions/sub-1' }
      })
    ).toEqual([googlePubSubRoutingKey.meet('subscriptions/sub-1')]);
    expect(
      extractGooglePubSubRoutingKeys('storage', {
        attributes: {
          bucketId: 'bucket-1',
          notificationConfig: 'projects/_/buckets/bucket-1/notificationConfigs/7'
        }
      })
    ).toEqual([googlePubSubRoutingKey.storage('bucket-1', '7')]);
  });

  it('returns no key when the producer identity is missing or foreign', () => {
    expect(extractGooglePubSubRoutingKeys('gmail', { data: 'text', attributes: {} })).toEqual(
      []
    );
    expect(extractGooglePubSubRoutingKeys('forms', { attributes: {} })).toEqual([]);
    expect(
      extractGooglePubSubRoutingKeys('meet', {
        attributes: { 'ce-source': '//example.com/subscriptions/sub-1' }
      })
    ).toEqual([]);
    expect(extractGooglePubSubRoutingKeys('storage', { attributes: {} })).toEqual([]);
  });
});
