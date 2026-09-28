import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';
import {
  mapPaymentLink,
  paymentLinkOutputSchema,
  type SquarePaymentLink
} from './checkout-shared';

export let listPaymentLinks = SlateTool.create(spec, {
  name: 'List Payment Links',
  key: 'list_payment_links',
  description:
    'List Square-hosted payment links and their checkout URLs, with cursor pagination.',
  tags: { readOnly: true }
})
  .scopes(allOf('ORDERS_READ'))
  .input(
    z.object({
      cursor: z.string().optional(),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Results per page, up to 1000')
    })
  )
  .output(
    z.object({ paymentLinks: z.array(paymentLinkOutputSchema), cursor: z.string().optional() })
  )
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['ORDERS_READ']);
    let response = await createClient(ctx.auth).request<{
      payment_links?: SquarePaymentLink[];
      cursor?: string;
    }>('GET', '/online-checkout/payment-links', {
      params: { cursor: ctx.input.cursor, limit: ctx.input.limit }
    });
    let links = response.payment_links ?? [];
    return {
      output: { paymentLinks: links.map(mapPaymentLink), cursor: response.cursor },
      message: `Found ${links.length} payment links${response.cursor ? '; more results available' : ''}.`
    };
  })
  .build();
