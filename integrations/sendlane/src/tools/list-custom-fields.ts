import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomFields = SlateTool.create(spec, {
  name: 'List Custom Fields',
  key: 'list_custom_fields',
  description: `Retrieve all custom fields defined in your Sendlane account. Custom fields store arbitrary contact attributes used for segmentation, automations, and personalization.`,
  constraints: [
    'Custom fields cannot be created or deleted via the API — they must be managed in the Sendlane dashboard.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number for pagination'),
      perPage: z.number().optional().default(25).describe('Number of results per page')
    })
  )
  .output(
    z.object({
      customFields: z.array(
        z.object({
          customFieldId: z.number().describe('Sendlane custom field ID'),
          name: z.string().describe('Custom field name'),
          type: z.string().describe('Custom field data type'),
          createdAt: z.string().describe('When the field was created'),
          updatedAt: z.string().describe('When the field was last updated')
        })
      ),
      currentPage: z.number(),
      lastPage: z.number(),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendlaneClient(ctx.auth.token);
    let result = await client.listCustomFields(ctx.input.page, ctx.input.perPage);

    let customFields = result.data.map(cf => ({
      customFieldId: cf.id,
      name: cf.name ?? '',
      type: cf.type ?? '',
      createdAt: cf.created_at ?? '',
      updatedAt: cf.updated_at ?? ''
    }));

    return {
      output: {
        customFields,
        currentPage: result.pagination.currentPage,
        lastPage: result.pagination.lastPage,
        total: result.pagination.total
      },
      message: `Found **${customFields.length}** custom fields (page ${result.pagination.currentPage} of ${result.pagination.lastPage}).`
    };
  })
  .build();
