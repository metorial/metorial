import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateInput } from '../lib/contracts';
import { spec } from '../spec';

export let listKlips = SlateTool.create(spec, {
  name: 'List Klips',
  key: 'list_klips',
  description: `List Klips (data visualization components) in your account. Filter by client or data source. Returns klip IDs, names, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clientId: z.string().optional().describe('Filter klips by client ID'),
      datasourceId: z.string().optional().describe('Filter klips by data source ID'),
      limit: z.number().optional().describe('Maximum number of results (max 100)'),
      offset: z.number().optional().describe('Index of first result to return')
    })
  )
  .output(
    z.object({
      klips: z.array(
        z.object({
          klipId: z.string().optional(),
          name: z.string().optional(),
          description: z.string().optional(),
          createdBy: z.string().optional(),
          dateCreated: z.string().optional(),
          lastUpdated: z.string().optional()
        })
      ),
      total: z.number().optional(),
      nextOffset: z.number().optional(),
      hasMore: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listKlips({
      clientId: ctx.input.clientId,
      datasourceId: ctx.input.datasourceId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let klips = (result?.data || []).map((klip: any) => ({
      klipId: klip.id,
      name: klip.name,
      description: klip.description,
      createdBy: klip.created_by,
      dateCreated: klip.date_created,
      lastUpdated: klip.last_updated
    }));

    const offset = ctx.input.offset ?? 0;
    const hasMore =
      result.data.length > 0 &&
      (typeof result.meta?.total === 'number'
        ? offset + klips.length < result.meta.total
        : klips.length === (ctx.input.limit ?? 25));
    return {
      output: {
        klips,
        total: result?.meta?.total,
        hasMore,
        nextOffset: hasMore ? offset + klips.length : undefined
      },
      message: `Found **${klips.length}** klip(s)${result?.meta?.total ? ` out of ${result.meta.total} total` : ''}.`
    };
  })
  .build();
