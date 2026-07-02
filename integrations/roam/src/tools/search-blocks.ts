import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { spec } from '../spec';

export let searchBlocks = SlateTool.create(spec, {
  name: 'Search Blocks',
  key: 'search_blocks',
  description: `Search for blocks containing specific text in the Roam Research graph. Returns matching blocks with their UIDs and content.

This is a convenience wrapper around a Datalog query that performs case-sensitive text search across all blocks.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchText: z.string().describe('Text to search for within blocks')
    })
  )
  .output(
    z.object({
      blocks: z
        .array(
          z.object({
            blockUid: z.string().describe('UID of the matching block'),
            content: z.string().describe('Text content of the matching block')
          })
        )
        .describe('List of blocks matching the search text')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RoamClient({
      graphName: ctx.config.graphName,
      token: ctx.auth.token
    });

    let query = `[:find ?block-uid ?block-str
 :in $ ?search-string
 :where
 [?b :block/uid ?block-uid]
 [?b :block/string ?block-str]
 [(clojure.string/includes? ?block-str ?search-string)]]`;

    let results = await client.query(query, [ctx.input.searchText]);

    let blocks: Array<{ blockUid: string; content: string }> = [];
    if (Array.isArray(results)) {
      for (let row of results) {
        if (Array.isArray(row) && row.length >= 2) {
          blocks.push({
            blockUid: String(row[0]),
            content: String(row[1])
          });
        }
      }
    }

    return {
      output: { blocks },
      message: `Found **${blocks.length}** block(s) matching "${ctx.input.searchText}" in graph **${ctx.config.graphName}**.`
    };
  })
  .build();
