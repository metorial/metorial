import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { paypalServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageSubscription = SlateTool.create(spec, {
  name: 'Manage Subscription',
  key: 'manage_subscription',
  description: `Manage PayPal subscriptions. List subscriptions, retrieve details, suspend, cancel, reactivate, or list transactions for a subscription.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'suspend', 'cancel', 'activate', 'listTransactions'])
        .describe('Action to perform'),
      subscriptionId: z
        .string()
        .optional()
        .describe('PayPal subscription ID (required except for list)'),
      reason: z.string().optional().describe('Reason for suspend/cancel/activate actions'),
      planIds: z
        .array(z.string())
        .optional()
        .describe('Plan IDs to filter subscriptions by for list'),
      statuses: z
        .array(
          z.enum([
            'APPROVAL_PENDING',
            'APPROVED',
            'ACTIVE',
            'SUSPENDED',
            'CANCELLED',
            'EXPIRED'
          ])
        )
        .optional()
        .describe('Subscription statuses to filter by for list'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter list results created after this ISO time'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter list results created before this ISO time'),
      page: z.number().optional().describe('Page number for list'),
      pageSize: z.number().optional().describe('Page size for list'),
      startTime: z
        .string()
        .optional()
        .describe('Start time for transaction listing (ISO 8601)'),
      endTime: z.string().optional().describe('End time for transaction listing (ISO 8601)')
    })
  )
  .output(
    z.object({
      subscriptionId: z.string().describe('Subscription ID'),
      status: z.string().optional().describe('Subscription status'),
      planId: z.string().optional().describe('Associated plan ID'),
      subscriberEmail: z.string().optional().describe('Subscriber email'),
      startTime: z.string().optional().describe('Subscription start time'),
      nextBillingTime: z.string().optional().describe('Next billing date'),
      subscriptions: z.array(z.any()).optional().describe('Subscription list results'),
      transactions: z.array(z.any()).optional().describe('Subscription transactions'),
      subscription: z.any().optional().describe('Full subscription details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    let requireSubscriptionId = () => {
      if (!ctx.input.subscriptionId) {
        throw paypalServiceError(`subscriptionId is required for ${ctx.input.action} action`);
      }
      return ctx.input.subscriptionId;
    };

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listSubscriptions({
          planIds: ctx.input.planIds,
          statuses: ctx.input.statuses,
          createdAfter: ctx.input.createdAfter,
          createdBefore: ctx.input.createdBefore,
          page: ctx.input.page,
          pageSize: ctx.input.pageSize,
          totalRequired: true
        });
        let subscriptions = (result.subscriptions || []) as any[];
        return {
          output: {
            subscriptionId: '',
            subscriptions: subscriptions.map((sub: any) => ({
              subscriptionId: sub.id,
              status: sub.status,
              planId: sub.plan_id,
              subscriberEmail: sub.subscriber?.email_address,
              startTime: sub.start_time
            }))
          },
          message: `Found ${subscriptions.length} subscription(s).`
        };
      }
      case 'get': {
        let subscriptionId = requireSubscriptionId();
        let sub = await client.getSubscription(subscriptionId);
        return {
          output: {
            subscriptionId: sub.id,
            status: sub.status,
            planId: sub.plan_id,
            subscriberEmail: sub.subscriber?.email_address,
            startTime: sub.start_time,
            nextBillingTime: sub.billing_info?.next_billing_time,
            subscription: sub
          },
          message: `Subscription \`${sub.id}\` is **${sub.status}**. Plan: \`${sub.plan_id}\`.`
        };
      }
      case 'suspend': {
        let subscriptionId = requireSubscriptionId();
        await client.suspendSubscription(
          subscriptionId,
          ctx.input.reason || 'Suspended by integration'
        );
        return {
          output: {
            subscriptionId,
            status: 'SUSPENDED'
          },
          message: `Subscription \`${subscriptionId}\` suspended.`
        };
      }
      case 'cancel': {
        let subscriptionId = requireSubscriptionId();
        await client.cancelSubscription(
          subscriptionId,
          ctx.input.reason || 'Cancelled by integration'
        );
        return {
          output: {
            subscriptionId,
            status: 'CANCELLED'
          },
          message: `Subscription \`${subscriptionId}\` cancelled.`
        };
      }
      case 'activate': {
        let subscriptionId = requireSubscriptionId();
        await client.activateSubscription(
          subscriptionId,
          ctx.input.reason || 'Reactivated by integration'
        );
        return {
          output: {
            subscriptionId,
            status: 'ACTIVE'
          },
          message: `Subscription \`${subscriptionId}\` reactivated.`
        };
      }
      case 'listTransactions': {
        if (!ctx.input.startTime || !ctx.input.endTime) {
          throw paypalServiceError(
            'startTime and endTime are required for listTransactions action'
          );
        }
        let subscriptionId = requireSubscriptionId();
        let result = await client.listSubscriptionTransactions(subscriptionId, {
          startTime: ctx.input.startTime,
          endTime: ctx.input.endTime
        });
        let transactions = (result.transactions || []) as any[];
        return {
          output: {
            subscriptionId,
            transactions
          },
          message: `Found ${transactions.length} transaction(s) for subscription \`${subscriptionId}\`.`
        };
      }
    }
  })
  .build();
