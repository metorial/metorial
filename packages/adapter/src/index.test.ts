import {
  Slate,
  SlateAuth,
  SlateConfig,
  SlateSpecification,
  SlateTool
} from '@slates/provider';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import {
  defineAdapter,
  type InferClient,
  isAdapterActionAvailable,
  isAdapterCapabilityAvailable
} from './index';

let createTestSpec = () => {
  let config = SlateConfig.create(z.object({}));
  let auth = SlateAuth.create<{}>().output(z.object({}));

  return SlateSpecification.create({
    key: 'gmail',
    name: 'Gmail',
    config,
    auth
  });
};

describe('defineAdapter', () => {
  it('defines, implements, and registers a reusable adapter contract', () => {
    let spec = createTestSpec();

    let EmailAdapter = defineAdapter({
      id: 'email',
      name: 'Email',
      capabilities: {
        send: { tools: ['email.send'] },
        read: { tools: ['email.search'] },
        inbound: { triggers: ['email.received'] }
      }
    });

    let sendEmail = EmailAdapter.defineTool({
      key: 'email.send',
      name: 'Send Email',
      input: z.object({
        to: z.array(z.string()),
        subject: z.string(),
        body: z.string()
      }),
      output: z.object({
        id: z.string()
      })
    });

    let searchEmail = EmailAdapter.defineTool({
      key: 'email.search',
      name: 'Search Email',
      input: z.object({
        query: z.string()
      }),
      output: z.object({
        messages: z.array(z.object({ id: z.string() }))
      })
    });

    let emailReceived = EmailAdapter.defineTrigger({
      key: 'email.received',
      name: 'Email Received',
      input: z.object({
        id: z.string(),
        from: z.string(),
        subject: z.string()
      }),
      output: z.object({
        type: z.literal('email.received'),
        id: z.string(),
        from: z.string(),
        subject: z.string()
      })
    });

    let sendEmailTool = sendEmail
      .implement(spec)
      .handleInvocation(async ctx => ({
        output: { id: `msg:${ctx.input.to.join(',')}` },
        message: 'sent'
      }))
      .build();

    let searchEmailTool = searchEmail
      .implement(spec)
      .handleInvocation(async () => ({
        output: { messages: [] },
        message: 'ok'
      }))
      .build();

    let emailReceivedTrigger = emailReceived
      .implement(spec)
      .webhook({
        handleRequest: async () => ({
          inputs: [{ id: '1', from: 'a@example.com', subject: 'Hello' }]
        }),
        handleEvent: async ctx => ({
          type: 'email.received',
          id: ctx.input.id,
          output: { type: 'email.received' as const, ...ctx.input }
        })
      })
      .build();

    expect(sendEmailTool.adapter).toBe('email');
    expect(sendEmailTool.key).toBe('email.send');
    expect(() => sendEmail.implement(spec).input(z.object({}))).toThrow(
      'Adapter contract input schema cannot be changed'
    );

    let emailAdapter = EmailAdapter.register({
      tools: [sendEmailTool, searchEmailTool],
      triggers: [emailReceivedTrigger]
    });

    expect(emailAdapter.id).toBe('email');
    expect(emailAdapter.capabilities).toEqual([
      { id: 'send', value: true },
      { id: 'read', value: true },
      { id: 'inbound', value: true }
    ]);

    let nativeTool = SlateTool.create(spec, {
      key: 'gmail.labels',
      name: 'Manage Labels'
    })
      .input(z.object({}))
      .output(z.object({}))
      .handleInvocation(async () => ({
        output: {},
        message: 'ok'
      }))
      .build();

    let slate = Slate.create({
      spec,
      tools: [sendEmailTool, searchEmailTool, nativeTool],
      triggers: [emailReceivedTrigger],
      adapters: [emailAdapter]
    });

    expect(slate.actions.map(action => action.key).sort()).toEqual([
      'email.received',
      'email.search',
      'email.send',
      'gmail.labels'
    ]);
    expect(slate.actions.filter(action => !action.adapter).map(action => action.key)).toEqual([
      'gmail.labels'
    ]);
  });

  it('derives only the capabilities that were implemented', () => {
    let spec = createTestSpec();

    let EmailAdapter = defineAdapter({
      id: 'email',
      name: 'Email',
      capabilities: {
        send: { tools: ['email.send'] },
        read: { tools: ['email.search'] },
        inbound: { triggers: ['email.received'] }
      }
    });

    let sendEmail = EmailAdapter.defineTool({
      key: 'email.send',
      name: 'Send Email',
      input: z.object({ to: z.string() }),
      output: z.object({ id: z.string() })
    });

    EmailAdapter.defineTool({
      key: 'email.search',
      name: 'Search Email',
      input: z.object({ query: z.string() }),
      output: z.object({ messages: z.array(z.string()) })
    });

    EmailAdapter.defineTrigger({
      key: 'email.received',
      name: 'Email Received',
      input: z.object({ id: z.string() }),
      output: z.object({ type: z.string() })
    });

    let sendEmailTool = sendEmail
      .implement(spec)
      .handleInvocation(async () => ({
        output: { id: '1' },
        message: 'sent'
      }))
      .build();

    let emailAdapter = EmailAdapter.register({
      tools: [sendEmailTool],
      triggers: []
    });

    expect(emailAdapter.capabilities).toEqual([{ id: 'send', value: true }]);
  });

  it('lets implementations set declared capabilities, defaulting unset ones to false', () => {
    let spec = createTestSpec();
    let EmailAdapter = defineAdapter({
      id: 'email',
      name: 'Email',
      capabilities: {
        send: { tools: ['email.send'] },
        markdown: {},
        cards: {}
      }
    });

    let sendEmail = EmailAdapter.defineTool({
      key: 'email.send',
      name: 'Send Email',
      input: z.object({}),
      output: z.object({})
    });

    let sendEmailTool = sendEmail
      .implement(spec)
      .handleInvocation(async () => ({
        output: {},
        message: 'ok'
      }))
      .build();

    expect(
      EmailAdapter.register({
        tools: [sendEmailTool],
        triggers: []
      }).capabilities
    ).toEqual([
      { id: 'send', value: true },
      { id: 'markdown', value: false },
      { id: 'cards', value: false }
    ]);

    expect(
      EmailAdapter.register({
        tools: [sendEmailTool],
        triggers: [],
        capabilities: { markdown: true }
      }).capabilities
    ).toEqual([
      { id: 'send', value: true },
      { id: 'markdown', value: true },
      { id: 'cards', value: false }
    ]);

    expect(() =>
      EmailAdapter.register({
        tools: [sendEmailTool],
        triggers: [],
        capabilities: { send: true } as any
      })
    ).toThrow(
      'Capability "send" is derived from tools or triggers and cannot be set by the implementation'
    );

    expect(() =>
      EmailAdapter.register({
        tools: [sendEmailTool],
        triggers: [],
        capabilities: { unknown: true } as any
      })
    ).toThrow('Capability "unknown" is not defined on adapter "email"');
  });

  it('rejects unknown implementations', () => {
    let spec = createTestSpec();
    let EmailAdapter = defineAdapter({
      id: 'email',
      name: 'Email',
      capabilities: {
        send: { tools: ['email.send'] }
      }
    });

    EmailAdapter.defineTool({
      key: 'email.send',
      name: 'Send Email',
      input: z.object({}),
      output: z.object({})
    });

    let nativeTool = SlateTool.create(spec, {
      key: 'gmail.labels',
      name: 'Manage Labels'
    })
      .input(z.object({}))
      .output(z.object({}))
      .handleInvocation(async () => ({
        output: {},
        message: 'ok'
      }))
      .build();

    expect(() =>
      EmailAdapter.register({
        tools: [nativeTool],
        triggers: []
      })
    ).toThrow('Tool "gmail.labels" is not defined on adapter "email"');
  });

  it('rejects capability rules that reference undefined actions', () => {
    let EmailAdapter = defineAdapter({
      id: 'email',
      name: 'Email',
      capabilities: {
        send: { tools: ['email.send'] }
      }
    });

    expect(() =>
      EmailAdapter.register({
        tools: [],
        triggers: []
      })
    ).toThrow('Capability "send" references unknown tool "email.send" on adapter "email"');
  });

  it('defines, implements, and registers public adapter tools', () => {
    let spec = createTestSpec();

    let EmailAdapter = defineAdapter({
      id: 'email',
      name: 'Email',
      capabilities: {
        setup: { tools: ['email.setup'] }
      }
    });

    let setupEmail = EmailAdapter.definePublicTool({
      key: 'email.setup',
      name: 'Setup Email',
      input: z.object({}),
      output: z.object({
        docsUrl: z.string()
      })
    });

    expect(setupEmail.isPublic).toBe(true);

    let setupEmailTool = setupEmail
      .implement(spec)
      .handleInvocation(async ctx => {
        expect(ctx).not.toHaveProperty('config');
        expect(ctx).not.toHaveProperty('auth');
        return {
          output: { docsUrl: 'https://example.com/email/setup' },
          message: 'ok'
        };
      })
      .build();

    expect(setupEmailTool.adapter).toBe('email');
    expect(setupEmailTool.isPublic).toBe(true);

    let emailAdapter = EmailAdapter.register({
      tools: [setupEmailTool],
      triggers: []
    });

    expect(emailAdapter.capabilities).toEqual([{ id: 'setup', value: true }]);

    let slate = Slate.create({
      spec,
      tools: [setupEmailTool],
      triggers: [],
      adapters: [emailAdapter]
    });

    expect(slate.actions.map(action => action.key)).toEqual(['email.setup']);
    expect(slate.actions[0]!.isPublic).toBe(true);
  });

  it('links tools and triggers into a typed client', () => {
    let EmailAdapter = defineAdapter({
      id: 'email',
      name: 'Email',
      capabilities: {
        send: { tools: ['email.send'] },
        inbound: { triggers: ['email.received'] },
        markdown: {}
      }
    });

    let sendEmail = EmailAdapter.defineTool({
      key: 'email.send',
      name: 'Send Email',
      input: z.object({
        to: z.array(z.string()),
        subject: z.string(),
        body: z.string()
      }),
      output: z.object({
        id: z.string()
      })
    });

    let emailReceived = EmailAdapter.defineTrigger({
      key: 'email.received',
      name: 'Email Received',
      input: z.object({
        id: z.string(),
        from: z.string()
      }),
      output: z.object({
        type: z.literal('email.received'),
        id: z.string(),
        from: z.string()
      })
    });

    let linked = EmailAdapter.link({
      tools: { sendEmail },
      triggers: { emailReceived }
    });

    expect(linked.tools).toEqual({ sendEmail });
    expect(linked.triggers).toEqual({ emailReceived });

    type Client = InferClient<typeof linked>;

    expectTypeOf<Client['tools']>().toHaveProperty('email.send');
    expectTypeOf<Client['tools']['email.send']['input']>().toEqualTypeOf<{
      to: string[];
      subject: string;
      body: string;
    }>();
    expectTypeOf<Client['tools']['email.send']['output']>().toEqualTypeOf<{
      id: string;
    }>();
    expectTypeOf<
      Client['triggers']['email.received']['output']['type']
    >().toEqualTypeOf<'email.received'>();
    expectTypeOf<Client['capabilities']['send']>().toEqualTypeOf<{
      readonly tools: readonly ['email.send'];
    }>();
    expectTypeOf<Client['capabilities']['inbound']>().toEqualTypeOf<{
      readonly triggers: readonly ['email.received'];
    }>();
    expectTypeOf<Client['capabilities']['markdown']>().toEqualTypeOf<{}>();
  });

  it('rejects incomplete and unknown catalog entries', () => {
    let EmailAdapter = defineAdapter({
      id: 'email',
      name: 'Email'
    });

    let sendEmail = EmailAdapter.defineTool({
      key: 'email.send',
      name: 'Send Email',
      input: z.object({}),
      output: z.object({})
    });

    let searchEmail = EmailAdapter.defineTool({
      key: 'email.search',
      name: 'Search Email',
      input: z.object({}),
      output: z.object({})
    });

    let OtherAdapter = defineAdapter({
      id: 'other',
      name: 'Other'
    });

    let otherTool = OtherAdapter.defineTool({
      key: 'other.send',
      name: 'Other Send',
      input: z.object({}),
      output: z.object({})
    });

    expect(() =>
      EmailAdapter.link({
        tools: { sendEmail },
        triggers: {}
      })
    ).toThrow('Tool "email.search" is defined on adapter "email" but was not linked');

    expect(() =>
      EmailAdapter.link({
        tools: { sendEmail, searchEmail, otherTool },
        triggers: {}
      })
    ).toThrow('Tool "other.send" is not defined on adapter "email"');
  });

  it('checks advertised action and capability availability', () => {
    let EmailAdapter = defineAdapter({
      id: 'email',
      name: 'Email',
      capabilities: {
        send: { tools: ['email.send'] },
        react: { tools: ['email.react.add'] },
        unreact: { tools: ['email.react.add', 'email.react.remove'] },
        inbound: { triggers: ['email.received'] },
        markdown: {}
      }
    });

    let sendEmail = EmailAdapter.defineTool({
      key: 'email.send',
      name: 'Send Email',
      input: z.object({}),
      output: z.object({})
    });

    let addReaction = EmailAdapter.defineTool({
      key: 'email.react.add',
      name: 'Add Reaction',
      input: z.object({}),
      output: z.object({})
    });

    let removeReaction = EmailAdapter.defineTool({
      key: 'email.react.remove',
      name: 'Remove Reaction',
      input: z.object({}),
      output: z.object({})
    });

    let emailReceived = EmailAdapter.defineTrigger({
      key: 'email.received',
      name: 'Email Received',
      input: z.object({}),
      output: z.object({})
    });

    let linked = EmailAdapter.link({
      tools: { sendEmail, addReaction, removeReaction },
      triggers: { emailReceived }
    });

    let advertised = {
      id: 'email',
      name: 'Email',
      capabilities: [
        { id: 'send', value: true },
        { id: 'react', value: true },
        { id: 'markdown', value: false }
      ]
    };

    expect(isAdapterActionAvailable(linked, advertised, 'email.send')).toBe(true);
    expect(isAdapterActionAvailable(linked, advertised.capabilities, 'email.send')).toBe(true);
    expect(isAdapterActionAvailable(linked, advertised, 'email.react.add')).toBe(true);
    expect(isAdapterActionAvailable(linked, advertised, 'email.react.remove')).toBe(false);
    expect(isAdapterActionAvailable(linked, advertised, 'email.received')).toBe(false);

    expect(isAdapterCapabilityAvailable(linked, advertised, 'send')).toBe(true);
    expect(isAdapterCapabilityAvailable(linked, advertised, 'inbound')).toBe(false);
    expect(isAdapterCapabilityAvailable(linked, advertised, 'markdown')).toBe(false);

    expect(
      isAdapterActionAvailable(
        linked,
        {
          capabilities: [
            { id: 'unreact', value: true },
            { id: 'inbound', value: true },
            { id: 'markdown', value: true }
          ]
        },
        'email.react.remove'
      )
    ).toBe(true);
    expect(
      isAdapterActionAvailable(
        linked,
        [
          { id: 'unreact', value: true },
          { id: 'inbound', value: true }
        ],
        'email.received'
      )
    ).toBe(true);
    expect(
      isAdapterCapabilityAvailable(linked, [{ id: 'markdown', value: true }], 'markdown')
    ).toBe(true);
  });
});
