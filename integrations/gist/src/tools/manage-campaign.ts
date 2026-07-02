import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

export let manageCampaign = SlateTool.create(spec, {
  name: 'Manage Campaign Subscription',
  key: 'manage_campaign',
  description: `Subscribe or unsubscribe a contact from a drip campaign. Optionally specify a starting email index or force-resubscribe contacts who previously unsubscribed.`
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign'),
      action: z
        .enum(['subscribe', 'unsubscribe'])
        .describe('Subscribe or unsubscribe the contact'),
      contactId: z.string().optional().describe('Contact ID'),
      email: z.string().optional().describe('Contact email address'),
      startingEmailIndex: z
        .number()
        .optional()
        .describe('Starting email index (for subscribe, 0-based)'),
      forceResubscribe: z
        .boolean()
        .optional()
        .describe('Force resubscribe if previously unsubscribed')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.contactId) body.contact_id = ctx.input.contactId;
    if (ctx.input.email) body.email = ctx.input.email;
    if (ctx.input.startingEmailIndex !== undefined)
      body.starting_email_index = ctx.input.startingEmailIndex;
    if (ctx.input.forceResubscribe !== undefined)
      body.force_resubscribe = ctx.input.forceResubscribe;

    if (ctx.input.action === 'subscribe') {
      await client.subscribeToCampaign(ctx.input.campaignId, body);
    } else {
      await client.unsubscribeFromCampaign(ctx.input.campaignId, body);
    }

    return {
      output: { success: true },
      message: `Contact ${ctx.input.action === 'subscribe' ? 'subscribed to' : 'unsubscribed from'} campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
