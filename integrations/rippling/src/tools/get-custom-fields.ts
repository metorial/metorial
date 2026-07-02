import { SlateTool } from 'slates';
import { z } from 'zod';
import { RipplingClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomFields = SlateTool.create(spec, {
  name: 'List Custom Fields',
  key: 'list_custom_fields',
  description: `Retrieve custom field definitions configured for the company. Custom fields allow companies to store additional employee or resource information beyond standard fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of custom fields to return'),
      offset: z.number().optional().describe('Number of custom fields to skip for pagination')
    })
  )
  .output(
    z.object({
      customFields: z.array(z.any()).describe('List of custom field definitions'),
      count: z.number().describe('Number of custom fields returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RipplingClient({ token: ctx.auth.token });
    let fields = await client.listCustomFields({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let items = Array.isArray(fields) ? fields : [];

    return {
      output: {
        customFields: items,
        count: items.length
      },
      message: `Retrieved **${items.length}** custom field(s).`
    };
  })
  .build();
