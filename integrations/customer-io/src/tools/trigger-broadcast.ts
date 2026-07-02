import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { customerIoServiceError } from '../lib/errors';
import { spec } from '../spec';

export let triggerBroadcast = SlateTool.create(spec, {
  name: 'Trigger Broadcast',
  key: 'trigger_broadcast',
  description: `Trigger an API-triggered broadcast to send messages to a wide audience. You set up the broadcast in the Customer.io UI and then trigger it via this action. Broadcasts are ideal for announcements, product launches, event notifications, etc.
You can target a segment, a list of customer IDs, or a list of email addresses.`,
  instructions: [
    'The broadcast must be set up as an API-triggered broadcast in the Customer.io UI first.',
    'You can provide data that populates Liquid merge fields in the broadcast message.',
    'Provide at most one audience selector: segmentIds, recipientsFilter, customerIds, emails, or recipients. Omit all audience selectors to use the broadcast default audience.'
  ],
  constraints: [
    'Rate limit: 1 request per 10 seconds.',
    'Broadcasts can only send to people already in your workspace.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      broadcastId: z.number().describe('The ID of the API-triggered broadcast to trigger'),
      broadcastData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Key-value data to populate Liquid merge fields in the broadcast message'),
      segmentIds: z
        .array(z.number())
        .optional()
        .describe('Target people matching one or more segment IDs'),
      recipientsFilter: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Customer.io audience filter object for custom broadcast recipients'),
      customerIds: z.array(z.string()).optional().describe('Target specific customer IDs'),
      emails: z.array(z.string()).optional().describe('Target specific email addresses'),
      recipients: z
        .record(z.string(), z.record(z.string(), z.unknown()))
        .optional()
        .describe('Map of customer IDs to per-recipient Liquid data'),
      emailAddDuplicates: z
        .boolean()
        .optional()
        .describe('If true, allow email addresses associated with multiple profiles'),
      emailIgnoreMissing: z
        .boolean()
        .optional()
        .describe('If true, skip recipients missing email addresses'),
      idIgnoreMissing: z
        .boolean()
        .optional()
        .describe('If true, skip missing customer IDs instead of failing the broadcast')
    })
  )
  .output(
    z.object({
      triggerId: z.number().optional().describe('The broadcast trigger ID'),
      success: z.boolean().describe('Whether the broadcast was triggered successfully')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let payload: Record<string, unknown> = {};
    if (ctx.input.broadcastData) payload.data = ctx.input.broadcastData;
    if (ctx.input.emailAddDuplicates !== undefined)
      payload.email_add_duplicates = ctx.input.emailAddDuplicates;
    if (ctx.input.emailIgnoreMissing !== undefined)
      payload.email_ignore_missing = ctx.input.emailIgnoreMissing;
    if (ctx.input.idIgnoreMissing !== undefined)
      payload.id_ignore_missing = ctx.input.idIgnoreMissing;

    let audienceSelectors = [
      ctx.input.segmentIds?.length,
      ctx.input.recipientsFilter ? 1 : 0,
      ctx.input.customerIds?.length,
      ctx.input.emails?.length,
      ctx.input.recipients ? 1 : 0
    ].filter(Boolean).length;

    if (audienceSelectors > 1) {
      throw customerIoServiceError(
        'Provide at most one broadcast audience selector: segmentIds, recipientsFilter, customerIds, emails, or recipients.'
      );
    }

    if (ctx.input.segmentIds?.length) {
      payload.recipients =
        ctx.input.segmentIds.length === 1
          ? { segment: { id: ctx.input.segmentIds[0] } }
          : {
              or: ctx.input.segmentIds.map(segmentId => ({ segment: { id: segmentId } }))
            };
    }
    if (ctx.input.recipientsFilter) payload.recipients = ctx.input.recipientsFilter;
    if (ctx.input.customerIds) payload.ids = ctx.input.customerIds;
    if (ctx.input.emails) payload.emails = ctx.input.emails;
    if (ctx.input.recipients)
      payload.per_user_data = Object.entries(ctx.input.recipients).map(([id, data]) => ({
        id,
        data
      }));

    let result = await appClient.triggerBroadcast(ctx.input.broadcastId, payload);

    return {
      output: { triggerId: result?.id, success: true },
      message: `Triggered broadcast **${ctx.input.broadcastId}** successfully.`
    };
  })
  .build();
