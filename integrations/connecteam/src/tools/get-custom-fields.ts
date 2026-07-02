import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from '../lib/client';
import { spec } from '../spec';

export let getCustomFields = SlateTool.create(spec, {
  name: 'Get Custom Fields',
  key: 'get_custom_fields',
  description: `Retrieve user custom field definitions and categories from Connecteam. Also retrieves smart groups. Useful for understanding the available custom fields before creating or updating users.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resource: z
        .enum(['custom_fields', 'categories', 'smart_groups'])
        .describe('What to retrieve'),
      customFieldIds: z.array(z.number()).optional().describe('Filter by custom field IDs'),
      categoryIds: z.array(z.number()).optional().describe('Filter by category IDs'),
      customFieldTypes: z
        .array(z.string())
        .optional()
        .describe('Filter by field types (str, date, number, dropdown, directManager)'),
      customFieldNames: z.array(z.string()).optional().describe('Filter by field names'),
      limit: z.number().optional().describe('Results per page'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      result: z.any().describe('API response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnecteamClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    if (ctx.input.resource === 'custom_fields') {
      let result = await client.getCustomFields({
        customFieldIds: ctx.input.customFieldIds,
        categoryIds: ctx.input.categoryIds,
        customFieldTypes: ctx.input.customFieldTypes,
        customFieldNames: ctx.input.customFieldNames,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      return {
        output: { result },
        message: `Retrieved user custom fields.`
      };
    }

    if (ctx.input.resource === 'categories') {
      let result = await client.getCustomFieldCategories({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      return {
        output: { result },
        message: `Retrieved custom field categories.`
      };
    }

    if (ctx.input.resource === 'smart_groups') {
      let result = await client.getSmartGroups();
      return {
        output: { result },
        message: `Retrieved smart groups.`
      };
    }

    throw new Error(`Unknown resource: ${ctx.input.resource}`);
  })
  .build();
