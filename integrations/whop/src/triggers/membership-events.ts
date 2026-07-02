import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let membershipEvents = SlateTrigger.create(spec, {
  name: 'Membership Events',
  key: 'membership_events',
  description:
    'Triggers when a membership is activated, deactivated, or its cancel-at-period-end setting changes.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Event type (membership.activated, membership.deactivated, membership.cancel_at_period_end_changed)'
        ),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      membershipId: z.string().describe('Membership ID'),
      status: z.string().describe('Membership status'),
      userId: z.string().nullable().describe('User ID'),
      username: z.string().nullable().describe('Username'),
      userEmail: z.string().nullable().describe('User email'),
      productId: z.string().nullable().describe('Product ID'),
      productTitle: z.string().nullable().describe('Product title'),
      planId: z.string().nullable().describe('Plan ID'),
      cancelAtPeriodEnd: z.boolean().describe('Whether membership cancels at period end'),
      licenseKey: z.string().nullable().describe('License key'),
      renewalPeriodEnd: z.string().nullable().describe('Renewal period end'),
      createdAt: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .output(
    z.object({
      membershipId: z.string().describe('Membership ID'),
      status: z.string().describe('Membership status'),
      userId: z.string().nullable().describe('User ID'),
      username: z.string().nullable().describe('Username'),
      userEmail: z.string().nullable().describe('User email'),
      productId: z.string().nullable().describe('Product ID'),
      productTitle: z.string().nullable().describe('Product title'),
      planId: z.string().nullable().describe('Plan ID'),
      cancelAtPeriodEnd: z.boolean().describe('Whether membership cancels at period end'),
      licenseKey: z.string().nullable().describe('License key'),
      renewalPeriodEnd: z.string().nullable().describe('Renewal period end'),
      createdAt: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = body.type;

      if (!eventType?.startsWith('membership.')) {
        return { inputs: [] };
      }

      let membership = body.data || {};

      return {
        inputs: [
          {
            eventType,
            eventId: `${membership.id}_${eventType}_${membership.updated_at || membership.created_at || Date.now()}`,
            membershipId: membership.id,
            status: membership.status,
            userId: membership.user?.id || null,
            username: membership.user?.username || null,
            userEmail: membership.user?.email || null,
            productId: membership.product?.id || null,
            productTitle: membership.product?.title || null,
            planId: membership.plan?.id || null,
            cancelAtPeriodEnd: membership.cancel_at_period_end || false,
            licenseKey: membership.license_key || null,
            renewalPeriodEnd: membership.renewal_period_end || null,
            createdAt: membership.created_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          membershipId: ctx.input.membershipId,
          status: ctx.input.status,
          userId: ctx.input.userId,
          username: ctx.input.username,
          userEmail: ctx.input.userEmail,
          productId: ctx.input.productId,
          productTitle: ctx.input.productTitle,
          planId: ctx.input.planId,
          cancelAtPeriodEnd: ctx.input.cancelAtPeriodEnd,
          licenseKey: ctx.input.licenseKey,
          renewalPeriodEnd: ctx.input.renewalPeriodEnd,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
