import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { WaveClient } from '../lib/client';
import { spec } from '../spec';

export const getResource = SlateTool.create(spec, {
  tags: { readOnly: true },
  name: 'Get Resource',
  key: 'get_resource',
  description:
    'Read one business, customer, invoice, account, product, sales tax or vendor by its exact ID. Monetary and Decimal values remain exact strings. A missing resource returns found=false; permission or provider failures are errors.',
  instructions: [
    'Discover businessId with list_businesses and resourceId with the matching list tool. For a business, omit resourceId or use businessId.'
  ]
})
  .scopes(
    anyOf(
      'business:read',
      'customer:read',
      'invoice:read',
      'account:read',
      'product:read',
      'sales_tax:read',
      'vendor:read'
    )
  )
  .input(
    z.object({
      kind: z
        .enum(['business', 'customer', 'invoice', 'account', 'product', 'salesTax', 'vendor'])
        .describe('Resource type to read.'),
      businessId: z.string().describe('Permitted business ID from list_businesses.'),
      resourceId: z
        .string()
        .optional()
        .describe(
          'Exact resource ID from the corresponding list tool; required except for business.'
        )
    })
  )
  .output(
    z.object({
      kind: z.string(),
      businessId: z.string(),
      resourceId: z.string().optional(),
      found: z.boolean(),
      resource: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe(
          'Validated provider resource with exact decimal strings; null only when the requested resource is absent.'
        )
    })
  )
  .handleInvocation(async ctx => {
    const resource = await new WaveClient(ctx.auth.token).getResource(
      ctx.input.kind,
      ctx.input.businessId,
      ctx.input.resourceId
    );
    return {
      output: { ...ctx.input, found: resource !== null, resource },
      message:
        resource === null
          ? 'The requested resource was not found.'
          : 'Read the requested resource.'
    };
  })
  .build();
