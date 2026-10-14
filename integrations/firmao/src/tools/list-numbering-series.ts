import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let listNumberingSeries = SlateTool.create(spec, {
  name: 'List Numbering Series',
  key: 'list_numbering_series',
  description:
    'List document numbering series in Firmao, including IDs, names, and numbering templates. Pass a series ID to get_next_document_number before creating an invoice, offer, order, or agreement.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      start: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Pagination offset, default 0'),
      limit: z.number().int().positive().optional().describe('Page size, default 50'),
      sort: z.string().optional().describe('Field to sort by'),
      dir: z.enum(['ASC', 'DESC']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      series: z.array(z.record(z.string(), z.unknown())),
      totalSize: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });
    let result = await client.listNumberingSeries(ctx.input);
    return {
      output: { series: result.data, totalSize: result.totalSize },
      message: `Found **${result.data.length}** numbering series (total: ${result.totalSize}).`
    };
  })
  .build();
