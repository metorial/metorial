import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { id, recordSchema } from '../lib/validation';
import { spec } from '../spec';

export const getResource = SlateTool.create(spec, {
  key: 'get_resource',
  name: 'Get Resource',
  description:
    'Read a specific Ramp user, vendor, department, location, spend program, fund, physical card, or virtual card by its own identifier. Discover IDs through list tools and resource relationships; a legacy limit ID is not assumed to identify a fund.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resource: z
        .enum([
          'user',
          'vendor',
          'department',
          'location',
          'spend_program',
          'fund',
          'physical_card',
          'virtual_card'
        ])
        .describe('Resource family in the current API.'),
      resourceId: z.string().describe('Exact identifier for this resource family.')
    })
  )
  .output(
    z.object({
      resource: recordSchema.describe(
        'Resource details without sensitive payment credentials or signed file URLs.'
      )
    })
  )
  .handleInvocation(async ctx => {
    const paths = {
      user: '/users',
      vendor: '/vendors',
      department: '/departments',
      location: '/locations',
      spend_program: '/spend-programs',
      fund: '/funds',
      physical_card: '/cards/physical',
      virtual_card: '/cards/virtual'
    };
    let resource = await clientFor(ctx).request(
      'GET',
      `${paths[ctx.input.resource]}/${id(ctx.input.resourceId, 'resourceId')}`
    );
    return { output: { resource }, message: 'Retrieved the requested resource.' };
  })
  .build();
