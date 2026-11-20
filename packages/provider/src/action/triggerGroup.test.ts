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
  finish: async () => ({ webhookRegistrationPayload: {} }),
  authenticate: async () => ({ routingKeys: [] })
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
      deliveryConfig: undefined
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

  it('allows a delivery config only with automatic registration and its handlers', () => {
    expect(build({ autoRegistration, deliveryConfig }).webhook?.deliveryConfig).toBe(
      deliveryConfig
    );
    expect(() => build({ manualRegistration, deliveryConfig })).toThrow(
      'A webhook delivery config requires automatic webhook registration'
    );
    let { finish: _, ...withoutFinish } = deliveryConfig;
    expect(() =>
      build({
        autoRegistration,
        deliveryConfig: withoutFinish as unknown as typeof deliveryConfig
      })
    ).toThrow('A webhook delivery config requires a finish handler');
  });

  it('requires a delivery config to authenticate the requests it receives', () => {
    let { authenticate: _, ...withoutAuthenticate } = deliveryConfig;
    expect(() =>
      build({
        autoRegistration,
        deliveryConfig: withoutAuthenticate as unknown as typeof deliveryConfig
      })
    ).toThrow('A webhook delivery config requires an authenticate handler');
  });
});

describe('trigger group selection options', () => {
  let polling = (
    selectionSchema: z.ZodType<Record<string, any>> = z.object({
      fileId: z.string(),
      tab: z.string().optional(),
      fileIds: z.array(z.string()),
      folder: z.object({ id: z.string() })
    })
  ) =>
    triggerGroup(spec, { key: 'group', name: 'Group', selectionSchema })
      .polling({ pollEvents: async () => ({ events: [] }) })
      .routingMatchers(async () => []);
  let list = async () => ({ options: [{ value: 'a', label: 'A' }] });
  let linked = { slate: 'acme/files', optionList: 'files', params: { kind: 'sheet' } };

  it('rejects fields that are not top-level properties of the selection schema', () => {
    for (let field of ['fileid', 'folder.id', 'id', 'constructor']) {
      expect(() => polling().selectionOptions({ [field]: { list } })).toThrow(
        `Selection field "${field}" is not a top-level property of the selection schema`
      );
    }
  });

  it('rejects a selection schema that is not a zod object', () => {
    for (let selectionSchema of [
      z.record(z.string(), z.string()),
      z.object({ fileId: z.string() }).optional() as z.ZodType<Record<string, any>>
    ]) {
      expect(() => polling(selectionSchema).selectionOptions({ fileId: { list } })).toThrow(
        'Selection options require the selection schema to be a zod object'
      );
    }
    expect(() =>
      triggerGroup(spec, { key: 'group', name: 'Group' }).selectionOptions({
        fileId: { list }
      })
    ).toThrow('Selection options require a selection schema');
  });

  it('rejects a bare handler instead of { list, linked }', () => {
    for (let declaration of [list, null]) {
      expect(() => polling().selectionOptions({ fileId: declaration as any })).toThrow(
        'Selection field "fileId" must be declared as { list, linked }'
      );
    }
  });

  it('accepts an own list, a linked list, or both per field', () => {
    let group = polling()
      .selectionOptions({ fileId: { list, linked } })
      .selectionOptions({
        tab: { linked: { slate: 'acme/files', optionList: 'tabs' } },
        fileIds: { list }
      })
      .build();
    expect(group.selectionOptions).toEqual({
      fileId: { list, linked },
      tab: { linked: { slate: 'acme/files', optionList: 'tabs' } },
      fileIds: { list }
    });
  });

  it('rejects a field without an own list or a linked list', () => {
    expect(() => polling().selectionOptions({ fileId: {} })).toThrow(
      'Selection field "fileId" needs its own options list, a linked option list, or both'
    );
  });

  it('rejects linked lists that do not name a scoped slate and a list', () => {
    expect(() =>
      polling().selectionOptions({
        fileId: { linked: { slate: 'files', optionList: 'files' } }
      })
    ).toThrow('must be written as <scope>/<name>');
    expect(() =>
      polling().selectionOptions({
        fileId: { linked: { slate: 'acme/files', optionList: ' ' } }
      })
    ).toThrow('Selection field "fileId" must name the option list it links to');
  });
});
