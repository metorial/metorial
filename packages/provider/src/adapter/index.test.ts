import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SlateTool } from '../action/tool';
import { SlateAuth } from '../auth';
import { SlateConfig } from '../config';
import { Slate } from '../specification/slate';
import { SlateSpecification } from '../specification/specification';
import { SlateAdapterSpec } from './spec';

let createTestSpec = () => {
  let config = SlateConfig.create(z.object({}));
  let auth = SlateAuth.create<{}>().output(z.object({}));

  return SlateSpecification.create({
    key: 'demo',
    name: 'Demo',
    config,
    auth
  });
};

describe('SlateAdapterSpec', () => {
  it('creates adapter tools and triggers linked to the adapter, then registers them', () => {
    let spec = createTestSpec();
    let gmailAdapterSpec = SlateAdapterSpec.create({
      id: 'gmail',
      name: 'Gmail',
      capabilities: [{ id: 'send_email', value: true }]
    });

    let sendEmailTool = gmailAdapterSpec
      .tool(spec, {
        key: 'send_email',
        name: 'Send Email'
      })
      .input(z.object({ to: z.string() }))
      .output(z.object({ id: z.string() }))
      .handleInvocation(async () => ({
        output: { id: 'msg_1' },
        message: 'sent'
      }))
      .build();

    let emailReceivedTrigger = gmailAdapterSpec
      .trigger(spec, {
        key: 'email_received',
        name: 'Email Received'
      })
      .input(z.object({ messageId: z.string() }))
      .output(z.object({ type: z.literal('email.received') }))
      .polling({
        handleEvent: async ctx => ({
          type: 'email.received',
          id: ctx.input.messageId,
          output: { type: 'email.received' as const }
        })
      })
      .build();

    expect(sendEmailTool.adapter).toBe('gmail');
    expect(emailReceivedTrigger.adapter).toBe('gmail');

    let gmailAdapter = gmailAdapterSpec.register({
      tools: [sendEmailTool],
      triggers: [emailReceivedTrigger]
    });

    expect(gmailAdapter.id).toBe('gmail');
    expect(gmailAdapter.name).toBe('Gmail');
    expect(gmailAdapter.capabilities).toEqual([{ id: 'send_email', value: true }]);
    expect(gmailAdapter.tools).toEqual([sendEmailTool]);
    expect(gmailAdapter.triggers).toEqual([emailReceivedTrigger]);

    let providerTool = SlateTool.create(spec, {
      key: 'list_labels',
      name: 'List Labels'
    })
      .input(z.object({}))
      .output(z.object({ labels: z.array(z.string()) }))
      .handleInvocation(async () => ({
        output: { labels: [] },
        message: 'ok'
      }))
      .build();

    let slate = Slate.create({
      spec,
      tools: [providerTool, sendEmailTool],
      triggers: [emailReceivedTrigger],
      adapters: [gmailAdapter]
    });

    expect(slate.actions.map(action => action.key)).toEqual([
      'email_received',
      'list_labels',
      'send_email'
    ]);
    expect(slate.adapters).toEqual([gmailAdapter]);
    expect(slate.actions.filter(action => !action.adapter).map(action => action.key)).toEqual([
      'list_labels'
    ]);
  });

  it('includes adapter actions in the slate even when they are only passed via the adapter', () => {
    let spec = createTestSpec();
    let gmailAdapterSpec = SlateAdapterSpec.create({
      id: 'gmail',
      name: 'Gmail'
    });

    let sendEmailTool = gmailAdapterSpec
      .tool(spec, {
        key: 'send_email',
        name: 'Send Email'
      })
      .input(z.object({}))
      .output(z.object({}))
      .handleInvocation(async () => ({
        output: {},
        message: 'ok'
      }))
      .build();

    let gmailAdapter = gmailAdapterSpec.register({
      tools: [sendEmailTool],
      triggers: []
    });

    let slate = Slate.create({
      spec,
      tools: [],
      triggers: [],
      adapters: [gmailAdapter]
    });

    expect(slate.actions).toEqual([sendEmailTool]);
    expect(slate.actions[0]!.adapter).toBe('gmail');
  });

  it('rejects tools created for a different adapter', () => {
    let spec = createTestSpec();
    let gmailAdapterSpec = SlateAdapterSpec.create({
      id: 'gmail',
      name: 'Gmail'
    });
    let outlookAdapterSpec = SlateAdapterSpec.create({
      id: 'outlook',
      name: 'Outlook'
    });

    let outlookTool = outlookAdapterSpec
      .tool(spec, {
        key: 'send_email',
        name: 'Send Email'
      })
      .input(z.object({}))
      .output(z.object({}))
      .handleInvocation(async () => ({
        output: {},
        message: 'ok'
      }))
      .build();

    expect(() =>
      gmailAdapterSpec.register({
        tools: [outlookTool],
        triggers: []
      })
    ).toThrow('Action "send_email" is linked to adapter "outlook", not "gmail"');
  });

  it('rejects provider tools that were not created through the adapter helpers', () => {
    let spec = createTestSpec();
    let gmailAdapterSpec = SlateAdapterSpec.create({
      id: 'gmail',
      name: 'Gmail'
    });

    let providerTool = SlateTool.create(spec, {
      key: 'send_email',
      name: 'Send Email'
    })
      .input(z.object({}))
      .output(z.object({}))
      .handleInvocation(async () => ({
        output: {},
        message: 'ok'
      }))
      .build();

    expect(() =>
      gmailAdapterSpec.register({
        tools: [providerTool],
        triggers: []
      })
    ).toThrow(
      'Action "send_email" must be created with this adapter\'s tool(), publicTool(), or trigger() helpers'
    );
  });

  it('rejects duplicate adapter action keys and duplicate adapter ids', () => {
    let spec = createTestSpec();
    let gmailAdapterSpec = SlateAdapterSpec.create({
      id: 'gmail',
      name: 'Gmail'
    });

    let sendEmailTool = gmailAdapterSpec
      .tool(spec, {
        key: 'send_email',
        name: 'Send Email'
      })
      .input(z.object({}))
      .output(z.object({}))
      .handleInvocation(async () => ({
        output: {},
        message: 'ok'
      }))
      .build();

    let sendEmailTrigger = gmailAdapterSpec
      .trigger(spec, {
        key: 'send_email',
        name: 'Send Email Trigger'
      })
      .input(z.object({}))
      .output(z.object({ type: z.string() }))
      .polling({
        handleEvent: async () => ({
          type: 'email.sent',
          id: '1',
          output: { type: 'email.sent' }
        })
      })
      .build();

    expect(() =>
      gmailAdapterSpec.register({
        tools: [sendEmailTool],
        triggers: [sendEmailTrigger]
      })
    ).toThrow('Adapter "gmail" already has an action with key "send_email"');

    let adapter = gmailAdapterSpec.register({
      tools: [sendEmailTool],
      triggers: []
    });

    expect(() =>
      Slate.create({
        spec,
        tools: [],
        triggers: [],
        adapters: [adapter, adapter]
      })
    ).toThrow('Adapter "gmail" is registered more than once');
  });

  it('rejects empty adapter ids and duplicate capability ids', () => {
    expect(() =>
      SlateAdapterSpec.create({
        id: '  ',
        name: 'Gmail'
      })
    ).toThrow('Adapter id must be a non-empty string');

    expect(() =>
      SlateAdapterSpec.create({
        id: 'gmail',
        name: 'Gmail',
        capabilities: [
          { id: 'send_email', value: true },
          { id: 'send_email', value: false }
        ]
      })
    ).toThrow('Adapter capability "send_email" is defined more than once');
  });

  it('creates public adapter tools that remain linked and public', () => {
    let spec = createTestSpec();
    let gmailAdapterSpec = SlateAdapterSpec.create({
      id: 'gmail',
      name: 'Gmail'
    });

    let setupTool = gmailAdapterSpec
      .publicTool(spec, {
        key: 'setup',
        name: 'Setup'
      })
      .input(z.object({}))
      .output(z.object({ ok: z.boolean() }))
      .handleInvocation(async ctx => {
        expect(ctx).not.toHaveProperty('config');
        expect(ctx).not.toHaveProperty('auth');
        return {
          output: { ok: true },
          message: 'ok'
        };
      })
      .build();

    expect(setupTool.adapter).toBe('gmail');
    expect(setupTool.isPublic).toBe(true);

    let gmailAdapter = gmailAdapterSpec.register({
      tools: [setupTool],
      triggers: []
    });

    let slate = Slate.create({
      spec,
      tools: [setupTool],
      triggers: [],
      adapters: [gmailAdapter]
    });

    expect(slate.actions.map(action => action.key)).toEqual(['setup']);
    expect(slate.actions[0]!.isPublic).toBe(true);
    expect(slate.actions[0]!.adapter).toBe('gmail');
  });
});
