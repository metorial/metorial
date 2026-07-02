import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let handleContactRequest = SlateTool.create(spec, {
  name: 'Handle Contact Request',
  key: 'handle_contact_request',
  description: `Approves or declines an incoming contact request. Use the "Get Contacts" tool with includeRequests=true to find pending request IDs.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      requestId: z.number().describe('ID of the incoming contact request'),
      action: z
        .enum(['approve', 'decline'])
        .describe('Whether to approve or decline the request')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      accountId: z
        .number()
        .optional()
        .describe('Account ID of the approved contact (only when approved)'),
      name: z.string().optional().describe('Name of the approved contact (only when approved)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);

    if (ctx.input.action === 'approve') {
      let contact = await client.approveRequest(ctx.input.requestId);
      return {
        output: {
          success: true,
          accountId: contact.account_id,
          name: contact.name
        },
        message: `Approved contact request from **${contact.name}**.`
      };
    } else {
      await client.declineRequest(ctx.input.requestId);
      return {
        output: { success: true },
        message: `Declined contact request ${ctx.input.requestId}.`
      };
    }
  })
  .build();
