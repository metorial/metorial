import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGiftCards = SlateTool.create(spec, {
  name: 'List Gift Cards',
  key: 'list_gift_cards',
  description: `Search and list gift cards with flexible filtering by status, dates, email, SKU, or order. Supports pagination for large result sets.`,
  tags: {
    readOnly: true
  },
  constraints: ['Maximum 100 results per page']
})
  .input(
    z.object({
      status: z
        .enum(['active', 'expired', 'redeemed', 'voided'])
        .optional()
        .describe('Filter by gift card status'),
      createdOnOrAfter: z
        .string()
        .optional()
        .describe('Filter by creation date (ISO 8601, UTC)'),
      updatedOnOrAfter: z
        .string()
        .optional()
        .describe('Filter by last update date (ISO 8601, UTC)'),
      orderId: z.string().optional().describe('Filter by associated order ID'),
      sku: z.string().optional().describe('Filter by SKU'),
      recipientEmail: z.string().optional().describe('Filter by recipient email'),
      purchaserEmail: z.string().optional().describe('Filter by purchaser email'),
      paymentTransactionId: z.string().optional().describe('Filter by payment transaction ID'),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe('Number of results per page (max 100)'),
      offset: z.number().optional().default(0).describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      giftCards: z.array(
        z
          .object({
            code: z.string().describe('Unique gift card code'),
            title: z.string().nullable().describe('Gift card title'),
            canBeRedeemed: z.boolean().describe('Whether redeemable'),
            hasExpired: z.boolean().describe('Whether expired'),
            isVoided: z.boolean().describe('Whether voided'),
            backingType: z.string().describe('Currency or Units'),
            remainingValue: z.number().describe('Remaining currency balance'),
            initialValue: z.number().describe('Initial currency value'),
            remainingUnits: z.number().nullable().describe('Remaining units'),
            initialUnits: z.number().nullable().describe('Initial units'),
            recipientName: z.string().nullable().describe('Recipient name'),
            recipientEmail: z.string().nullable().describe('Recipient email'),
            sku: z.string().nullable().describe('SKU'),
            expiresOn: z.string().nullable().describe('Expiry date')
          })
          .passthrough()
      ),
      total: z.number().describe('Total number of matching gift cards'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    let result = await client.listGiftCards(ctx.input);

    return {
      output: result,
      message: `Found **${result.total}** gift cards (showing ${result.giftCards.length})${result.hasMore ? ' — more results available' : ''}`
    };
  })
  .build();
