import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SlateAuth } from '../auth';
import { SlateConfig } from '../config';
import { SlateSpecification } from '../specification/specification';
import { triggerGroup } from './triggerGroup';

let spec = SlateSpecification.create({
  key: 'demo',
  name: 'Demo',
  config: SlateConfig.create(z.object({})),
  auth: SlateAuth.create<{}>().output(z.object({}))
});

let autoRegistration = {
  webhookTargetList: async () => ({ targets: [], nextPageToken: null }),
  webhookRegister: async () => ({
    webhookRegistrationIdentifier: 'reg',
    webhookRegistrationPayload: {}
  }),
  webhookUnregister: async () => {}
};
let setup = async () => ({ webhookSetupDocument: '', partialWebhookRegistrationPayload: {} });
let manualRegistration = {
  userConfigSchema: z.object({}),
  fullConfigSchema: z.object({}),
  setup
};
let deliveryConfig = {
  ...manualRegistration,
  finish: async () => ({ webhookRegistrationPayload: {} })
};

type WebhookProps = Parameters<ReturnType<typeof triggerGroup>['webhook']>[0];

let build = (props: Omit<WebhookProps, 'process'>) =>
  triggerGroup(spec, { key: 'group', name: 'Group' })
    .webhook({ ...props, process: async () => ({ events: [] }) })
    .routingMatchers(async () => [])
    .build();

describe('webhook trigger group declaration', () => {
  it('builds plain automatic and manual groups as before', () => {
    expect(build({ autoRegistration }).webhook).toMatchObject({
      autoRegistration,
      manualRegistration: undefined,
      deliveryConfig: undefined,
      googlePubSub: undefined
    });
    expect(build({ manualRegistration }).webhook).toMatchObject({
      autoRegistration: undefined,
      manualRegistration,
      deliveryConfig: undefined
    });
  });

  it('requires exactly one of automatic or manual registration', () => {
    let message =
      'Webhook trigger groups require exactly one of autoRegistration or manualRegistration';
    expect(() => build({})).toThrow(message);
    expect(() => build({ deliveryConfig })).toThrow(message);
    expect(() => build({ autoRegistration, manualRegistration })).toThrow(message);
  });

  it('allows a delivery config only with automatic registration and a finish handler', () => {
    expect(build({ autoRegistration, deliveryConfig }).webhook?.deliveryConfig).toBe(
      deliveryConfig
    );
    expect(() => build({ manualRegistration, deliveryConfig })).toThrow(
      'A webhook delivery config requires automatic webhook registration'
    );
    expect(() =>
      build({
        autoRegistration,
        deliveryConfig: manualRegistration as unknown as typeof deliveryConfig
      })
    ).toThrow('A webhook delivery config requires a finish handler');
  });

  it('requires automatic registration and a delivery config for Google Pub/Sub delivery', () => {
    let googlePubSub = { product: 'gmail' as const };
    let message =
      'Google Pub/Sub delivery requires a supported product, automatic webhook registration, and a delivery config';
    expect(
      build({ autoRegistration, deliveryConfig, googlePubSub }).webhook?.googlePubSub
    ).toEqual(googlePubSub);
    expect(() => build({ autoRegistration, googlePubSub })).toThrow(message);
    expect(() => build({ manualRegistration, googlePubSub })).toThrow(message);
    expect(() =>
      build({
        autoRegistration,
        deliveryConfig,
        googlePubSub: { product: 'tasks' } as unknown as typeof googlePubSub
      })
    ).toThrow(message);
  });
});
