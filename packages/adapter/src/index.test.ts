import {
  Slate,
  SlateAuth,
  SlateConfig,
  SlateSpecification,
  SlateTool
} from '@slates/provider';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineAdapter } from './index';

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

  it('rejects unknown implementations and incomplete capability rules', () => {
    let spec = createTestSpec();
    let EmailAdapter = defineAdapter({
      id: 'email',
      name: 'Email',
      capabilities: {
        send: { tools: ['email.send'] }
      }
    });

    expect(() =>
      defineAdapter({
        id: 'email',
        name: 'Email',
        capabilities: {
          send: {}
        }
      })
    ).toThrow('Adapter capability "send" must reference at least one tool or trigger');

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
});
