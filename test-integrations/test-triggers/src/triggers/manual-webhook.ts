import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { manualWebhookGroup } from './manualWebhookGroup';

let manualWebhookEvent = z
  .object({
    type: z.string().optional(),
    id: z.string().optional(),
    accountId: z.string(),
    workspaceId: z.string(),
    value: z.unknown().optional()
  })
  .loose();

export let manualWebhookEcho = SlateTrigger.create(spec, {
  key: 'manual_webhook_echo',
  name: 'Manual Webhook Echo',
  description: 'Emits signed deliveries received on the manually registered webhook URL.'
})
  .triggerGroup(manualWebhookGroup)
  .input(manualWebhookEvent)
  .output(
    z.object({
      message: z.string(),
      type: z.string().optional(),
      accountId: z.string(),
      workspaceId: z.string(),
      value: z.unknown().optional()
    })
  )
  .matches(payload => {
    let event = payload as { type?: unknown };
    return !event || event.type !== 'url_verification';
  })
  .map(async ctx => ({
    type: ctx.input.type ? `test.manual.${ctx.input.type}` : 'test.manual.echo',
    id: ctx.input.id ?? `manual-echo-${ctx.input.accountId}`,
    output: {
      message: 'Manually registered webhook payload processed by test trigger integration.',
      type: ctx.input.type,
      accountId: ctx.input.accountId,
      workspaceId: ctx.input.workspaceId,
      value: ctx.input.value
    }
  }))
  .build();
