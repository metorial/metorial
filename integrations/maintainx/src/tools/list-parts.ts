import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listParts = SlateTool.create(spec, {
  name: 'List Parts',
  key: 'list_parts',
  description: `Lists parts from MaintainX inventory. Supports cursor-based pagination. Returns part name, description, stock levels, and costs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results per page (1-200, default 100)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      parts: z
        .array(
          z.object({
            partId: z.number().describe('Part ID'),
            name: z.string().optional().describe('Part name'),
            description: z.string().optional().describe('Description'),
            quantity: z.number().optional().describe('Current stock quantity'),
            unitCost: z.number().optional().describe('Unit cost'),
            minimumQuantity: z.number().optional().describe('Minimum stock alert threshold'),
            barcode: z.string().optional().describe('Barcode'),
            createdAt: z.string().optional().describe('Created at'),
            updatedAt: z.string().optional().describe('Updated at')
          })
        )
        .describe('List of parts'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listParts({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let parts = (result.parts ?? []).map((p: any) => ({
      partId: p.id,
      name: p.name,
      description: p.description,
      quantity: p.quantity,
      unitCost: p.unitCost,
      minimumQuantity: p.minimumQuantity,
      barcode: p.barcode,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    return {
      output: {
        parts,
        nextCursor: result.nextCursor ?? undefined
      },
      message: `Found **${parts.length}** part(s)${result.nextCursor ? ' (more pages available)' : ''}.`
    };
  })
  .build();
