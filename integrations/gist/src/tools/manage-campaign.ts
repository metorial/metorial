import { createApiServiceError, SlateTool } from 'slates';
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
      rawResponse: z.any().optional().describe('Complete provider response data'),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    if (!ctx.input.email && !ctx.input.contactId)
      throw createApiServiceError('Provide email or contactId.');
    let body: Record<string, any> = {};
    if (ctx.input.contactId && !ctx.input.email) {
      let data = await client.getContact(ctx.input.contactId);
      let contact = data.contact ?? data;
      if (contact.email) body.email = contact.email;
      else if (contact.user_id !== undefined) body.user_id = contact.user_id;
      else
        throw createApiServiceError(
          'This contact has no email or external user ID for campaign subscriptions.'
        );
    }
    if (ctx.input.email) body.email = ctx.input.email;
    if (ctx.input.startingEmailIndex !== undefined)
      body.starting_email_index = ctx.input.startingEmailIndex;
    if (ctx.input.forceResubscribe !== undefined)
      body.reactivate_if_removed = ctx.input.forceResubscribe;

    if (ctx.input.action === 'subscribe') {
      await client.subscribeToCampaign(ctx.input.campaignId, body);
    } else {
      await client.unsubscribeFromCampaign(ctx.input.campaignId, body);
    }

    return {
      output: { rawResponse: client.responses, success: true },
      message: `Contact ${ctx.input.action === 'subscribe' ? 'subscribed to' : 'unsubscribed from'} campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
