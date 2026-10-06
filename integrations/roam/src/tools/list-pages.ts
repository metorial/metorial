import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { fail } from '../lib/validation';
import { spec } from '../spec';
export let listPages = SlateTool.create(spec, {
  name: 'List Pages',
  key: 'list_pages',
  description:
    'Discover page titles and UIDs with a native Datalog query. Returns a locally sorted, bounded subset; no native cursor or complete-graph guarantee is provided.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .default(100)
        .describe('Local output cap; the native query is subject to provider read limits')
    })
  )
  .output(
    z.object({
      pages: z.array(z.object({ pageUid: z.string(), title: z.string() })),
      returnedCount: z.number().int(),
      truncated: z.boolean().describe('Whether native results exceeded the local output cap')
    })
  )
  .handleInvocation(async ctx => {
    const client = new RoamClient({ graphName: ctx.config.graphName, token: ctx.auth.token });
    const result = await client.query(
      '[:find ?uid ?title :where [?page :node/title ?title] [?page :block/uid ?uid]]'
    );
    if (
      !Array.isArray(result) ||
      result.some(
        row =>
          !Array.isArray(row) ||
          row.length !== 2 ||
          typeof row[0] !== 'string' ||
          typeof row[1] !== 'string'
      )
    )
      fail('Roam returned malformed page discovery rows.');
    const pages = (result as [string, string][])
      .map(([pageUid, title]) => ({ pageUid, title }))
      .sort((a, b) => a.title.localeCompare(b.title) || a.pageUid.localeCompare(b.pageUid))
      .slice(0, ctx.input.limit);
    return {
      output: { pages, returnedCount: pages.length, truncated: result.length > pages.length },
      message: 'Read page titles and UIDs within the local output cap.'
    };
  })
  .build();
