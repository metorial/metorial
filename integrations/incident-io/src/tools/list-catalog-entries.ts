import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCatalogEntries = SlateTool.create(spec, {
  name: 'List Catalog Entries',
  key: 'list_catalog_entries',
  description: `List entries for a given catalog type. Catalog entries represent items like services, teams, or environments in your service catalog. Returns names, external IDs, aliases, and attribute values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      catalogTypeId: z.string().describe('ID of the catalog type to list entries for'),
      pageSize: z.number().min(1).max(250).optional().describe('Number of results per page'),
      after: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      entries: z.array(
        z.object({
          catalogEntryId: z.string(),
          name: z.string(),
          externalId: z.string().optional(),
          aliases: z.array(z.string()).optional(),
          attributeValues: z.record(z.string(), z.any()).optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCatalogEntries(ctx.input.catalogTypeId, {
      pageSize: ctx.input.pageSize,
      after: ctx.input.after
    });

    let entries = result.catalog_entries.map((e: any) => ({
      catalogEntryId: e.id,
      name: e.name,
      externalId: e.external_id || undefined,
      aliases: e.aliases || undefined,
      attributeValues: e.attribute_values || undefined,
      createdAt: e.created_at || undefined,
      updatedAt: e.updated_at || undefined
    }));

    return {
      output: {
        entries,
        nextCursor: result.pagination_meta?.after || undefined
      },
      message: `Found **${entries.length}** catalog entries.`
    };
  })
  .build();
