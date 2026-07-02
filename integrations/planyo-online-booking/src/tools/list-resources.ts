import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let listResources = SlateTool.create(spec, {
  name: 'List Resources',
  key: 'list_resources',
  description: `Lists bookable resources with optional filtering by publish status, resource type, and custom properties. Supports pagination (up to 100 per page).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .optional()
        .describe('Page number (zero-based, max 100 results per page)'),
      listPublishedOnly: z.boolean().optional().describe('Only return published resources'),
      listReservableOnly: z
        .boolean()
        .optional()
        .describe('Only return directly reservable resources'),
      resourceTypes: z
        .enum(['resource', 'bundle', 'package'])
        .optional()
        .describe('Filter by resource type'),
      sort: z
        .string()
        .optional()
        .describe('Sort by: resname, site, location, or a custom property name'),
      customProperties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Filter by custom resource properties')
    })
  )
  .output(
    z.object({
      resources: z
        .array(
          z.object({
            resourceId: z.string().describe('Resource ID'),
            name: z.string().optional().describe('Resource name'),
            siteId: z.string().optional().describe('Site ID'),
            quantity: z.number().optional().describe('Total units'),
            category: z.string().optional().describe('Category'),
            isPublished: z.boolean().optional().describe('Whether published'),
            currency: z.string().optional().describe('Currency'),
            properties: z.any().optional().describe('Custom properties')
          })
        )
        .describe('List of resources'),
      totalCount: z.number().optional().describe('Total number of matching resources'),
      maxPage: z.number().optional().describe('Highest available page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let result = await client.listResources({
      detailLevel: 7, // name + settings + properties
      page: ctx.input.page,
      listPublishedOnly: ctx.input.listPublishedOnly,
      listReservableOnly: ctx.input.listReservableOnly,
      resourceTypes: ctx.input.resourceTypes,
      sort: ctx.input.sort,
      customProperties: ctx.input.customProperties
    });

    let resources = (result?.resources || []).map((r: any) => ({
      resourceId: String(r.id),
      name: r.name,
      siteId: r.site_id ? String(r.site_id) : undefined,
      quantity: r.quantity != null ? Number(r.quantity) : undefined,
      category: r.category,
      isPublished: r.is_published != null ? Boolean(r.is_published) : undefined,
      currency: r.currency,
      properties: r.properties
    }));

    return {
      output: {
        resources,
        totalCount:
          result?.resource_count != null ? Number(result.resource_count) : resources.length,
        maxPage: result?.max_page != null ? Number(result.max_page) : undefined
      },
      message: `Found **${result?.resource_count || resources.length}** resource(s).`
    };
  })
  .build();
