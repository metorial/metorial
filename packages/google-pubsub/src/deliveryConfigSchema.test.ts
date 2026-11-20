// Resource names: https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions
// Push audience: https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
import { describe, expect, it } from 'vitest';
import {
  googlePubSubDeliveryConfigSchema,
  isSameGooglePubSubDeliveryConfig,
  parseGooglePubSubDeliveryConfig
} from './deliveryConfigSchema';

let deliveryConfig = {
  projectId: 'delivery-project',
  topicName: 'projects/delivery-project/topics/gmail-shared',
  subscriptionName: 'projects/delivery-project/subscriptions/gmail-shared',
  pushServiceAccountEmail: 'push@delivery-project.iam.gserviceaccount.com',
  audience: 'https://delivery.example/google-pubsub/gmail'
};

describe('googlePubSubDeliveryConfigSchema', () => {
  it('accepts a delivery config whose resources belong to its project', () => {
    expect(googlePubSubDeliveryConfigSchema.parse(deliveryConfig)).toEqual(deliveryConfig);
  });

  it.each([
    { topicName: 'projects/other/topics/gmail-shared' },
    { subscriptionName: 'projects/other/subscriptions/gmail-shared' },
    { subscriptionName: 'gmail-shared' },
    { pushServiceAccountEmail: 'not-an-email' },
    { audience: 'not a url' },
    { audience: 'http://delivery.example/google-pubsub/gmail' },
    { projectId: '' }
  ])('rejects %o', change => {
    expect(
      googlePubSubDeliveryConfigSchema.safeParse({ ...deliveryConfig, ...change }).success
    ).toBe(false);
  });
});

describe('delivery config helpers', () => {
  it('parses the supplied delivery config and fails with the caller message without one', () => {
    expect(parseGooglePubSubDeliveryConfig(deliveryConfig, 'Not configured.')).toEqual(
      deliveryConfig
    );
    for (let supplied of [
      undefined,
      null,
      {},
      'config',
      { ...deliveryConfig, audience: '' },
      { googlePubSub: deliveryConfig }
    ])
      expect(() => parseGooglePubSubDeliveryConfig(supplied, 'Not configured.')).toThrow(
        expect.objectContaining({
          data: expect.objectContaining({ message: 'Not configured.' })
        })
      );
  });

  it('keeps only the delivery config fields', () => {
    expect(
      parseGooglePubSubDeliveryConfig(
        { ...deliveryConfig, privateKey: 'must-not-be-saved' },
        'Not configured.'
      )
    ).toEqual(deliveryConfig);
  });

  it('compares every delivery config field', () => {
    expect(isSameGooglePubSubDeliveryConfig(deliveryConfig, { ...deliveryConfig })).toBe(true);
    for (let key of Object.keys(deliveryConfig) as (keyof typeof deliveryConfig)[])
      expect(
        isSameGooglePubSubDeliveryConfig(deliveryConfig, {
          ...deliveryConfig,
          [key]: `${deliveryConfig[key]}x`
        })
      ).toBe(false);
  });
});
