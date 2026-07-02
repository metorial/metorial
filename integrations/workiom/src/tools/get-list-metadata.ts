import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getListMetadata = SlateTool.create(spec, {
  name: 'Get List Metadata',
  key: 'get_list_metadata',
  description: `Retrieves metadata for a specific list (table), including its fields, views, and filters. This is essential before creating or updating records, as it provides field IDs and their data types. You can choose which metadata sections to expand.`,
  instructions: [
    'Use the expand parameter to include fields, views, and/or filters in the response.',
    'Field IDs from the metadata response are required when creating or updating records.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to retrieve metadata for'),
      expand: z
        .array(z.enum(['Fields', 'Views', 'Filters']))
        .optional()
        .describe('Sections to expand in the response. Defaults to all if not specified.')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('ID of the list'),
      name: z.string().optional().describe('Name of the list'),
      appId: z.string().optional().describe('ID of the parent app'),
      fields: z
        .array(z.any())
        .optional()
        .describe('Array of field definitions with IDs, names, and data types'),
      views: z.array(z.any()).optional().describe('Array of view definitions'),
      filters: z.array(z.any()).optional().describe('Array of filter definitions'),
      raw: z.any().describe('Full raw metadata response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let expand = ctx.input.expand ?? ['Fields', 'Views', 'Filters'];
    let metadata = await client.getListMetadata(ctx.input.listId, expand);

    return {
      output: {
        listId: metadata?.id ?? ctx.input.listId,
        name: metadata?.name,
        appId: metadata?.appId,
        fields: metadata?.fields,
        views: metadata?.views,
        filters: metadata?.filters,
        raw: metadata
      },
      message: `Retrieved metadata for list **${metadata?.name ?? ctx.input.listId}**. Found **${metadata?.fields?.length ?? 0}** field(s), **${metadata?.views?.length ?? 0}** view(s).`
    };
  })
  .build();
