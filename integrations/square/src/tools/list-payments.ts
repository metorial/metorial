import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';
import { mapPayment, paymentOutputSchema } from './payment-shared';

export let listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description:
    'List payments with documented date, location, card, amount, and offline filters. New payments can take several seconds to appear.',
  tags: { readOnly: true }
})
  .scopes(allOf('PAYMENTS_READ'))
  .input(
    z.object({
      beginTime: z.string().optional().describe('Created-at start time in RFC 3339 format'),
      endTime: z.string().optional().describe('Created-at end time in RFC 3339 format'),
      updatedAtBeginTime: z
        .string()
        .optional()
        .describe('Updated-at start time in RFC 3339 format'),
      updatedAtEndTime: z
        .string()
        .optional()
        .describe('Updated-at end time in RFC 3339 format'),
      sortField: z.enum(['CREATED_AT', 'UPDATED_AT']).optional(),
      sortOrder: z.enum(['ASC', 'DESC']).optional(),
      locationId: z.string().optional().describe('Location ID; discover with list_locations'),
      total: z
        .number()
        .int()
        .safe()
        .nonnegative()
        .optional()
        .describe('Exact total in minor currency units'),
      last4: z.string().length(4).optional().describe('Payment card last four digits'),
      cardBrand: z.string().optional().describe('Payment card brand, such as VISA'),
      isOfflinePayment: z.boolean().optional(),
      offlineBeginTime: z
        .string()
        .optional()
        .describe('Offline client-created start time in RFC 3339 format'),
      offlineEndTime: z
        .string()
        .optional()
        .describe('Offline client-created end time in RFC 3339 format'),
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional()
    })
  )
  .output(z.object({ payments: z.array(paymentOutputSchema), cursor: z.string().optional() }))
  .handleInvocation(async ctx => {
    let result = await createClient(ctx.auth).listPayments(ctx.input);
    let payments = result.payments.map(mapPayment);
    return {
      output: { payments, cursor: result.cursor },
      message: `Found **${payments.length}** payment(s).${result.cursor ? ' More results available with cursor.' : ''}`
    };
  })
  .build();
