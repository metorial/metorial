import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `Retrieve financial transaction reports. Transactions cover orders, redemptions, credit additions, expirations, voids, and reactivations. Supports filtering by date, event type, gift card code, and location.`,
  tags: {
    readOnly: true
  },
  constraints: ['Maximum 100 results per page']
})
  .input(
    z.object({
      createdOnOrAfter: z
        .string()
        .optional()
        .describe('Filter by creation date (ISO 8601, UTC)'),
      updatedOnOrAfter: z
        .string()
        .optional()
        .describe('Filter by update date (ISO 8601, UTC)'),
      giftCardCode: z.string().optional().describe('Filter by gift card code'),
      eventType: z
        .enum([
          'GiftCardCreated',
          'CreditAdded',
          'Redeemed',
          'Expired',
          'Unexpired',
          'Voided',
          'Reactivated'
        ])
        .optional()
        .describe('Filter by event type'),
      locationId: z.string().optional().describe('Filter by location ID'),
      limit: z.number().optional().default(10).describe('Results per page (max 100)'),
      offset: z.number().optional().default(0).describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      transactions: z.array(
        z.object({
          transactionId: z.string().describe('Transaction ID'),
          giftCardCode: z.string().describe('Associated gift card code'),
          eventType: z.string().describe('Event type'),
          eventOccuredOn: z.string().describe('When the event occurred'),
          eventOccuredAtLocationId: z.string().nullable().describe('Location ID'),
          value: z.number().describe('Currency value change'),
          units: z.number().nullable().describe('Units change'),
          whoEmail: z.string().nullable().describe('Email of user who triggered the event'),
          whoName: z.string().nullable().describe('Name of user who triggered the event'),
          reason: z.string().nullable().describe('Reason logged with the event'),
          metadata: z.record(z.string(), z.string()).nullable().describe('Metadata')
        })
      ),
      total: z.number().describe('Total matching transactions'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    let result = await client.listTransactions(ctx.input);

    let transactions = (result.transactions || []).map((t: any) => ({
      ...t,
      transactionId: t.id
    }));

    return {
      output: {
        transactions,
        total: result.total,
        hasMore: result.hasMore
      },
      message: `Found **${result.total}** transactions (showing ${transactions.length})${result.hasMore ? ' — more results available' : ''}`
    };
  })
  .build();
