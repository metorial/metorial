import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { autoWebhookGroup } from './autoWebhookGroup';

let autoWebhookEvent = z
  .object({
    type: z.string().optional(),
    id: z.string().optional(),
    channelId: z.string().optional(),
    accountId: z.string().optional(),
    workspaceId: z.string().optional(),
    value: z.unknown().optional()
  })
  .loose();

export let autoWebhookEcho = SlateTrigger.create(spec, {
  key: 'auto_webhook_echo',
  name: 'Auto Webhook Echo',
  description: 'Emits every signed auto-registered webhook delivery that is not ignored.'
})
  .triggerGroup(autoWebhookGroup)
  .input(autoWebhookEvent)
  .output(
    z.object({
      message: z.string(),
      type: z.string().optional(),
      channelId: z.string().optional(),
      accountId: z.string().optional(),
      workspaceId: z.string().optional(),
      value: z.unknown().optional()
    })
  )
  .matches(payload => {
    let event = payload as { type?: unknown };
    return !event || event.type !== 'ignore';
  })
  .map(async ctx => ({
    type: ctx.input.type ? `test.auto.${ctx.input.type}` : 'test.auto.echo',
    id: ctx.input.id ?? `auto-echo-${ctx.input.channelId ?? 'unknown'}`,
    output: {
      message: 'Auto-registered webhook payload processed by test trigger integration.',
      type: ctx.input.type,
      channelId: ctx.input.channelId,
      accountId: ctx.input.accountId,
      workspaceId: ctx.input.workspaceId,
      value: ctx.input.value
    }
  }))
  .build();

export let autoWebhookCreated = SlateTrigger.create(spec, {
  key: 'auto_webhook_created',
  name: 'Auto Webhook Created',
  description: 'Emits only auto-registered webhook deliveries with type `created`.'
})
  .triggerGroup(autoWebhookGroup)
  .input(autoWebhookEvent)
  .output(
    z.object({
      id: z.string().optional(),
      channelId: z.string().optional(),
      accountId: z.string().optional(),
      workspaceId: z.string().optional(),
      value: z.unknown().optional()
    })
  )
  .matches(payload => {
    let event = payload as { type?: unknown };
    return !!event && event.type === 'created';
  })
  .map(async ctx => ({
    type: 'test.auto.created',
    id: ctx.input.id ?? `auto-created-${ctx.input.channelId ?? 'unknown'}`,
    output: {
      id: ctx.input.id,
      channelId: ctx.input.channelId,
      accountId: ctx.input.accountId,
      workspaceId: ctx.input.workspaceId,
      value: ctx.input.value
    }
  }))
  .build();
