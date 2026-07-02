import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCatalogTypes = SlateTool.create(spec, {
  name: 'List Catalog Types',
  key: 'list_catalog_types',
  description: `List all catalog types in your incident.io service catalog. Catalog types define schemas for entries like services, teams, and environments. Useful for discovering available catalog type IDs before querying entries.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      catalogTypes: z.array(
        z.object({
          catalogTypeId: z.string(),
          name: z.string(),
          description: z.string().optional(),
          schema: z.any().optional(),
          estimatedCount: z.number().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCatalogTypes();

    let catalogTypes = result.catalog_types.map((ct: any) => ({
      catalogTypeId: ct.id,
      name: ct.name,
      description: ct.description || undefined,
      schema: ct.schema || undefined,
      estimatedCount: ct.estimated_count ?? undefined,
      createdAt: ct.created_at || undefined,
      updatedAt: ct.updated_at || undefined
    }));

    return {
      output: { catalogTypes },
      message: `Found **${catalogTypes.length}** catalog type(s).`
    };
  })
  .build();
