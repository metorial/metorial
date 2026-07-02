import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let accountNotifications = SlateTrigger.create(spec, {
  name: 'Account Notifications',
  key: 'account_notifications',
  description:
    'Triggered when account-level events occur on Coinbase, such as new transactions (sends, receives, buys, sells), wallet creation, and address-related events. Webhooks must be configured in your Coinbase OAuth application or API key settings.'
})
  .input(
    z.object({
      notificationId: z.string().describe('Notification ID'),
      notificationType: z
        .string()
        .describe('Notification type (e.g., wallet:transactions:send)'),
      resourceType: z.string().describe('Resource type'),
      resourceId: z.string().describe('Resource ID'),
      accountId: z.string().optional().describe('Related account ID'),
      resource: z.any().describe('Full resource data from the notification'),
      deliveryAttempts: z.number().optional().describe('Number of delivery attempts'),
      createdAt: z.string().optional().describe('Notification creation time')
    })
  )
  .output(
    z.object({
      resourceType: z.string().describe('Resource type (transaction, account, address)'),
      resourceId: z.string().describe('Resource ID'),
      accountId: z.string().optional().describe('Related account ID'),
      transactionType: z
        .string()
        .optional()
        .nullable()
        .describe('Transaction type if applicable (send, receive, buy, sell)'),
      status: z.string().optional().nullable().describe('Resource status'),
      amount: z.string().optional().nullable().describe('Transaction amount'),
      currency: z.string().optional().nullable().describe('Currency code'),
      nativeAmount: z.string().optional().nullable().describe('Amount in native currency'),
      nativeCurrency: z.string().optional().nullable().describe('Native currency code'),
      createdAt: z.string().optional().nullable().describe('Resource creation time')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body?.id) {
        return { inputs: [] };
      }

      let additional = body.additional_data || {};
      let resource = body.data || {};

      return {
        inputs: [
          {
            notificationId: body.id,
            notificationType: body.type || 'unknown',
            resourceType: body.resource || resource.resource || 'unknown',
            resourceId: resource.id || body.id,
            accountId: body.account?.id || additional.account_id,
            resource,
            deliveryAttempts: body.delivery_attempts,
            createdAt: body.created_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { resource } = ctx.input;

      return {
        type: ctx.input.notificationType,
        id: ctx.input.notificationId,
        output: {
          resourceType: ctx.input.resourceType,
          resourceId: ctx.input.resourceId,
          accountId: ctx.input.accountId,
          transactionType: resource?.type || null,
          status: resource?.status || null,
          amount: resource?.amount?.amount || null,
          currency: resource?.amount?.currency || null,
          nativeAmount: resource?.native_amount?.amount || null,
          nativeCurrency: resource?.native_amount?.currency || null,
          createdAt: resource?.created_at || ctx.input.createdAt || null
        }
      };
    }
  })
  .build();
