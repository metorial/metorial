import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { spec } from '../spec';

export let browseCatalog = SlateTool.create(spec, {
  name: 'Browse Catalog',
  key: 'browse_catalog',
  description: `Browse the Segment integration catalog to discover available source, destination, and warehouse types. Returns metadata IDs needed when creating new sources, destinations, or warehouses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      catalogType: z
        .enum(['sources', 'destinations', 'warehouses'])
        .describe('Type of catalog to browse'),
      metadataId: z
        .string()
        .optional()
        .describe('Specific metadata ID to get details for (sources/destinations only)'),
      count: z.number().optional().describe('Number of items per page')
    })
  )
  .output(
    z.object({
      items: z
        .array(
          z.object({
            metadataId: z.string().describe('Metadata ID used when creating resources'),
            name: z.string().optional().describe('Display name'),
            slug: z.string().optional().describe('URL-friendly identifier'),
            description: z.string().optional().describe('Description'),
            categories: z.array(z.string()).optional().describe('Categories'),
            logos: z
              .object({
                defaultUrl: z.string().optional(),
                markUrl: z.string().optional()
              })
              .optional()
              .describe('Logo URLs')
          })
        )
        .describe('Catalog items')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);

    if (ctx.input.metadataId) {
      let item: any;
      if (ctx.input.catalogType === 'sources') {
        item = await client.getCatalogSource(ctx.input.metadataId);
      } else if (ctx.input.catalogType === 'destinations') {
        item = await client.getCatalogDestination(ctx.input.metadataId);
      }

      if (item) {
        return {
          output: {
            items: [
              {
                metadataId: item.id,
                name: item.name,
                slug: item.slug,
                description: item.description,
                categories: item.categories ?? [],
                logos: item.logos
              }
            ]
          },
          message: `Found catalog item **${item.name}** (\`${item.id}\`)`
        };
      }
    }

    let result: any;
    if (ctx.input.catalogType === 'sources') {
      result = await client.listCatalogSources({ count: ctx.input.count });
    } else if (ctx.input.catalogType === 'destinations') {
      result = await client.listCatalogDestinations({ count: ctx.input.count });
    } else {
      result = await client.listCatalogWarehouses({ count: ctx.input.count });
    }

    let rawItems =
      result?.sourceCatalogItems ??
      result?.destinationsCatalog ??
      result?.warehousesCatalog ??
      [];
    let items = rawItems.map((item: any) => ({
      metadataId: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      categories: item.categories ?? [],
      logos: item.logos
    }));

    return {
      output: { items },
      message: `Found **${items.length}** ${ctx.input.catalogType} in the catalog`
    };
  })
  .build();
