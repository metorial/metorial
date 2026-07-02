import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listFilters = SlateTool.create(spec, {
  name: 'List Filters',
  key: 'list_filters',
  description: `List available filter views for an entity type in Freshsales. View IDs returned here are needed for listing records with the **listLeads**, **listContacts**, **listAccounts**, and **listDeals** tools.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      entityType: z
        .enum(['leads', 'contacts', 'deals', 'sales_accounts'])
        .describe('Entity type to get filters for')
    })
  )
  .output(
    z.object({
      filters: z.array(
        z.object({
          filterId: z.number(),
          name: z.string().nullable().optional(),
          modelClassName: z.string().nullable().optional(),
          isDefault: z.boolean().nullable().optional(),
          isPublic: z.boolean().nullable().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let entityType = ctx.input.entityType;

    let filters: Record<string, any>[];
    if (entityType === 'leads') {
      filters = await client.getLeadFilters();
    } else if (entityType === 'contacts') {
      filters = await client.getContactFilters();
    } else if (entityType === 'deals') {
      filters = await client.getDealFilters();
    } else {
      filters = await client.getAccountFilters();
    }

    let mapped = filters.map((f: Record<string, any>) => ({
      filterId: f.id,
      name: f.name,
      modelClassName: f.model_class_name,
      isDefault: f.is_default,
      isPublic: f.is_public
    }));

    return {
      output: { filters: mapped },
      message: `Found **${mapped.length}** filter views for ${entityType}.`
    };
  })
  .build();
