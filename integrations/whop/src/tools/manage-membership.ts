import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhopClient } from '../lib/client';
import { spec } from '../spec';

let membershipOutputSchema = z.object({
  membershipId: z.string().describe('Unique membership identifier'),
  status: z.string().describe('Membership status'),
  userId: z.string().nullable().describe('User ID'),
  username: z.string().nullable().describe('Username'),
  userEmail: z.string().nullable().describe('User email'),
  productId: z.string().nullable().describe('Product ID'),
  productTitle: z.string().nullable().describe('Product title'),
  planId: z.string().nullable().describe('Plan ID'),
  currency: z.string().nullable().describe('Currency code'),
  licenseKey: z.string().nullable().describe('Software license key'),
  cancelAtPeriodEnd: z.boolean().describe('Whether membership cancels at period end'),
  metadata: z.record(z.string(), z.string()).nullable().describe('Custom metadata'),
  renewalPeriodStart: z.string().nullable().describe('Current renewal period start'),
  renewalPeriodEnd: z.string().nullable().describe('Current renewal period end'),
  createdAt: z.string().describe('ISO 8601 creation timestamp')
});

let mapMembership = (m: any) => ({
  membershipId: m.id,
  status: m.status,
  userId: m.user?.id || null,
  username: m.user?.username || null,
  userEmail: m.user?.email || null,
  productId: m.product?.id || null,
  productTitle: m.product?.title || null,
  planId: m.plan?.id || null,
  currency: m.currency || null,
  licenseKey: m.license_key || null,
  cancelAtPeriodEnd: m.cancel_at_period_end || false,
  metadata: m.metadata || null,
  renewalPeriodStart: m.renewal_period_start || null,
  renewalPeriodEnd: m.renewal_period_end || null,
  createdAt: m.created_at
});

export let manageMembership = SlateTool.create(spec, {
  name: 'Manage Membership',
  key: 'manage_membership',
  description: `Retrieve, update metadata, cancel, uncancel, pause, or resume a Whop membership.
Use **action** to specify: \`get\`, \`update_metadata\`, \`cancel\`, \`uncancel\`, \`pause\`, or \`resume\`.`,
  instructions: [
    'membershipId is always required.',
    'For "update_metadata": provide metadata as key-value pairs. This replaces existing metadata.',
    'For "cancel": cancellationMode defaults to "at_period_end". Use "immediate" for instant cancellation.',
    'For "pause": optionally set voidPayments to void outstanding past-due payments.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['get', 'update_metadata', 'cancel', 'uncancel', 'pause', 'resume'])
        .describe('Operation to perform'),
      membershipId: z.string().describe('Membership ID or license key'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Metadata key-value pairs (for update_metadata)'),
      cancellationMode: z
        .enum(['at_period_end', 'immediate'])
        .optional()
        .describe('Cancellation mode (for cancel)'),
      voidPayments: z
        .boolean()
        .optional()
        .describe('Whether to void past-due payments (for pause)')
    })
  )
  .output(membershipOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WhopClient(ctx.auth.token);
    let { action, membershipId } = ctx.input;
    let m: any;

    if (action === 'get') {
      m = await client.getMembership(membershipId);
    } else if (action === 'update_metadata') {
      if (!ctx.input.metadata)
        throw new Error('metadata is required for update_metadata action');
      m = await client.updateMembership(membershipId, ctx.input.metadata);
    } else if (action === 'cancel') {
      m = await client.cancelMembership(membershipId, ctx.input.cancellationMode);
    } else if (action === 'uncancel') {
      m = await client.uncancelMembership(membershipId);
    } else if (action === 'pause') {
      m = await client.pauseMembership(membershipId, ctx.input.voidPayments);
    } else if (action === 'resume') {
      m = await client.resumeMembership(membershipId);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    let actionLabels: Record<string, string> = {
      get: 'Retrieved',
      update_metadata: 'Updated metadata for',
      cancel: 'Canceled',
      uncancel: 'Uncanceled',
      pause: 'Paused',
      resume: 'Resumed'
    };

    return {
      output: mapMembership(m),
      message: `${actionLabels[action]} membership \`${m.id}\` (status: **${m.status}**).`
    };
  })
  .build();
