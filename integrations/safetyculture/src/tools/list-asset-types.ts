import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAssetTypes = SlateTool.create(spec, {
  name: 'List Asset Types',
  key: 'list_asset_types',
  description:
    'Discover asset type IDs before creating assets with manage_assets. Optionally retrieve organization asset field IDs and their value types to prepare custom field values.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageSize: z.number().int().min(1).max(100).optional(),
      pageToken: z.string().optional(),
      search: z.string().optional().describe('Search asset type names.'),
      includeFields: z
        .boolean()
        .optional()
        .describe(
          'Also retrieve the organization asset fields. Field associations vary by asset type.'
        )
    })
  )
  .output(
    z.object({
      types: z.array(z.object({ typeId: z.string(), name: z.string().optional() })),
      fields: z.array(z.any()).optional(),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listAssetTypes(ctx.input);
    let fields = ctx.input.includeFields ? await client.listAssetFields() : undefined;
    let types = result.types.map((type: any) => ({
      typeId: type.id,
      name: type.name ?? undefined
    }));
    return {
      output: { types, fields, nextPageToken: result.nextPageToken },
      message: `Found ${types.length} asset types.${result.nextPageToken ? ' More results are available.' : ''}`
    };
  })
  .build();
