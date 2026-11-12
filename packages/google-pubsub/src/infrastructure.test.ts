// Resource names: https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions
// Push audience: https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
import { describe, expect, it } from 'vitest';
import {
  googlePubSubInfrastructureSchema,
  isSameGooglePubSubInfrastructure,
  parseGooglePubSubInfrastructure
} from './infrastructure';

let descriptor = {
  projectId: 'delivery-project',
  topicName: 'projects/delivery-project/topics/gmail-shared',
  subscriptionName: 'projects/delivery-project/subscriptions/gmail-shared',
  pushServiceAccountEmail: 'push@delivery-project.iam.gserviceaccount.com',
  audience: 'https://delivery.example/google-pubsub/gmail'
};

describe('googlePubSubInfrastructureSchema', () => {
  it('accepts a descriptor whose resources belong to its project', () => {
    expect(googlePubSubInfrastructureSchema.parse(descriptor)).toEqual(descriptor);
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
      googlePubSubInfrastructureSchema.safeParse({ ...descriptor, ...change }).success
    ).toBe(false);
  });
});

describe('descriptor helpers', () => {
  it('parses the supplied descriptor and fails with the caller message without one', () => {
    expect(
      parseGooglePubSubInfrastructure({ googlePubSub: descriptor }, 'Not configured.')
    ).toEqual(descriptor);
    for (let supplied of [
      undefined,
      null,
      {},
      { googlePubSub: { ...descriptor, audience: '' } }
    ])
      expect(() => parseGooglePubSubInfrastructure(supplied, 'Not configured.')).toThrow(
        expect.objectContaining({
          data: expect.objectContaining({ message: 'Not configured.' })
        })
      );
  });

  it('compares every descriptor field', () => {
    expect(isSameGooglePubSubInfrastructure(descriptor, { ...descriptor })).toBe(true);
    for (let key of Object.keys(descriptor) as (keyof typeof descriptor)[])
      expect(
        isSameGooglePubSubInfrastructure(descriptor, {
          ...descriptor,
          [key]: `${descriptor[key]}x`
        })
      ).toBe(false);
  });
});
