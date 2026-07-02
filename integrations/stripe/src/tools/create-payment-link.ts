import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let createPaymentLink = SlateTool.create(spec, {
  name: 'Create Payment Link',
  key: 'create_payment_link',
  description: `Create a shareable Stripe Payment Link for accepting one-time or recurring payments without building a custom checkout page. Also retrieve or list existing payment links.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list']).describe('Operation to perform'),
      paymentLinkId: z.string().optional().describe('Payment link ID (for get)'),
      lineItems: z
        .array(
          z.object({
            priceId: z.string().describe('Price ID'),
            quantity: z.number().optional().describe('Quantity (default 1)')
          })
        )
        .optional()
        .describe('Line items for the payment link (required for create)'),
      allowPromotionCodes: z.boolean().optional().describe('Whether to allow promotion codes'),
      metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata'),
      limit: z.number().optional().describe('Max results (for list)'),
      startingAfter: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      paymentLinkId: z.string().optional().describe('Payment link ID'),
      url: z.string().optional().describe('Shareable payment link URL'),
      active: z.boolean().optional().describe('Whether the payment link is active'),
      paymentLinks: z
        .array(
          z.object({
            paymentLinkId: z.string(),
            url: z.string(),
            active: z.boolean()
          })
        )
        .optional()
        .describe('List of payment links'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StripeClient({
      token: ctx.auth.token,
      stripeAccountId: ctx.config.stripeAccountId
    });

    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.lineItems || ctx.input.lineItems.length === 0) {
        throw stripeServiceError('lineItems are required for create action');
      }

      let params: Record<string, any> = {
        line_items: ctx.input.lineItems.map(item => ({
          price: item.priceId,
          quantity: item.quantity || 1
        }))
      };
      if (ctx.input.allowPromotionCodes !== undefined)
        params.allow_promotion_codes = ctx.input.allowPromotionCodes;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;

      let link = await client.createPaymentLink(params);
      return {
        output: {
          paymentLinkId: link.id,
          url: link.url,
          active: link.active
        },
        message: `Created payment link **${link.id}**\n\nURL: ${link.url}`
      };
    }

    if (action === 'get') {
      if (!ctx.input.paymentLinkId)
        throw stripeServiceError('paymentLinkId is required for get action');
      let link = await client.getPaymentLink(ctx.input.paymentLinkId);
      return {
        output: {
          paymentLinkId: link.id,
          url: link.url,
          active: link.active
        },
        message: `Payment link **${link.id}**: ${link.active ? 'active' : 'inactive'}\n\nURL: ${link.url}`
      };
    }

    // list
    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;

    let result = await client.listPaymentLinks(params);
    return {
      output: {
        paymentLinks: result.data.map((l: any) => ({
          paymentLinkId: l.id,
          url: l.url,
          active: l.active
        })),
        hasMore: result.has_more
      },
      message: `Found **${result.data.length}** payment link(s)`
    };
  })
  .build();
