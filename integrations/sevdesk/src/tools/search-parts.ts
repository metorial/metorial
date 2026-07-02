import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let searchParts = SlateTool.create(spec, {
  name: 'Search Parts',
  key: 'search_parts',
  description: `Search and list parts (products/services) in the sevDesk inventory. Filter by name or part number. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter by name (partial match)'),
      partNumber: z.string().optional().describe('Filter by part/SKU number'),
      limit: z.number().optional().describe('Max results (default: 100, max: 1000)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      parts: z.array(
        z.object({
          partId: z.string(),
          name: z.string().optional(),
          partNumber: z.string().optional(),
          price: z.string().optional(),
          priceGross: z.string().optional(),
          taxRate: z.string().optional(),
          stock: z.string().optional(),
          createdAt: z.string().optional()
        })
      ),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let results = await client.listParts({
      name: ctx.input.name,
      partNumber: ctx.input.partNumber,
      limit: ctx.input.limit ?? 100,
      offset: ctx.input.offset
    });

    let parts = (results ?? []).map((p: any) => ({
      partId: String(p.id),
      name: p.name ?? undefined,
      partNumber: p.partNumber ?? undefined,
      price: p.price != null ? String(p.price) : undefined,
      priceGross: p.priceGross != null ? String(p.priceGross) : undefined,
      taxRate: p.taxRate != null ? String(p.taxRate) : undefined,
      stock: p.stock != null ? String(p.stock) : undefined,
      createdAt: p.create ?? undefined
    }));

    return {
      output: {
        parts,
        totalCount: parts.length
      },
      message: `Found **${parts.length}** part(s).`
    };
  })
  .build();
