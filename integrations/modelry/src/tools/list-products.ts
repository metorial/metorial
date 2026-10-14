import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, formatProduct } from '../lib/client';
import { paginationInputFields, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `List a page of products in your Modelry account. Search by text, SKU, batch, tags, source, content, or viewer kind. Returns product details and pagination information when available.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...paginationInputFields,
      keywords: z
        .string()
        .optional()
        .describe('Search product titles, tags, descriptions, SKUs, and batch IDs.'),
      sku: z.string().optional().describe('Filter by product SKU.'),
      batchId: z.string().optional().describe('Filter by batch ID.'),
      title: z.string().optional().describe('Filter by product title.'),
      tags: z.array(z.string()).optional().describe('Filter by product tags.'),
      sourceLabels: z
        .array(z.string())
        .optional()
        .describe('Filter by source labels, such as Modeling request or a creator name.'),
      contentLabels: z
        .array(z.string())
        .optional()
        .describe('Filter by asset labels, such as Delivery Files, Images, or .max.'),
      toolKinds: z
        .array(z.string())
        .optional()
        .describe('Filter by viewer kinds, such as 3D, 360HD, QR, or AR.'),
      sortBy: z
        .array(z.string())
        .length(2)
        .optional()
        .describe(
          'Sort attribute and direction, for example ["title", "asc"]. Direction: asc or desc.'
        )
    })
  )
  .output(
    z.object({
      products: z
        .array(
          z.object({
            productId: z.string().describe('ID of the product.'),
            sku: z.string().nullable().describe('SKU of the product.'),
            title: z.string().nullable().describe('Title of the product.'),
            batchId: z.string().nullable().describe('Batch ID associated with the product.'),
            description: z.string().nullable().describe('Description of the product.'),
            tags: z.array(z.string()).nullable().describe('Tags assigned to the product.'),
            dimensions: z.string().nullable().describe('Dimensions of the product.'),
            externalUrl: z.string().nullable().describe('External URL of the product.')
          })
        )
        .describe('List of products.'),
      pagination: paginationSchema
        .optional()
        .describe('Pagination metadata returned by Modelry.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listProducts(ctx.input);

    let products = result.data.map(formatProduct);

    return {
      output: { products, pagination: result.meta },
      message: `Found **${products.length}** product(s).`
    };
  })
  .build();
