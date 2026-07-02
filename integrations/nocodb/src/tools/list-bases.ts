import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBases = SlateTool.create(spec, {
  name: 'List Bases',
  key: 'list_bases',
  description: `List all bases (databases/projects) accessible in the NocoDB instance. Returns base metadata including IDs, titles, and table counts.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      bases: z
        .array(
          z.object({
            baseId: z.string().describe('Base ID'),
            title: z.string().describe('Base title'),
            description: z.string().optional().describe('Base description'),
            color: z.string().optional().describe('Base color'),
            meta: z.any().optional()
          })
        )
        .describe('Array of base objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let result = await client.listBases();
    let list = result?.list ?? result ?? [];
    let bases = (Array.isArray(list) ? list : []).map((b: any) => ({
      baseId: b.id,
      title: b.title ?? '',
      description: b.description,
      color: b.color,
      meta: b.meta
    }));

    return {
      output: { bases },
      message: `Found **${bases.length}** base(s).`
    };
  })
  .build();
