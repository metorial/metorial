import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteMember = SlateTool.create(spec, {
  name: 'Delete Member',
  key: 'delete_member',
  description: `Permanently delete a member from your Memberstack app. Optionally also delete the associated Stripe customer and cancel any active Stripe subscriptions.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      memberId: z.string().describe('The member ID (e.g. mem_abc123) to delete'),
      deleteStripeCustomer: z
        .boolean()
        .optional()
        .describe('Also delete the associated Stripe customer. Defaults to false.'),
      cancelStripeSubscriptions: z
        .boolean()
        .optional()
        .describe('Also cancel active Stripe subscriptions. Defaults to false.')
    })
  )
  .output(
    z.object({
      memberId: z.string().describe('ID of the deleted member')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteMember(ctx.input.memberId, {
      deleteStripeCustomer: ctx.input.deleteStripeCustomer,
      cancelStripeSubscriptions: ctx.input.cancelStripeSubscriptions
    });

    return {
      output: result,
      message: `Deleted member **${result.memberId}**${ctx.input.deleteStripeCustomer ? ' (Stripe customer also deleted)' : ''}${ctx.input.cancelStripeSubscriptions ? ' (Stripe subscriptions canceled)' : ''}`
    };
  })
  .build();
