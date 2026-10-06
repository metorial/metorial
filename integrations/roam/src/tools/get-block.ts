import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { fail } from '../lib/validation';
import { spec } from '../spec';
export let getBlock = SlateTool.create(spec, {
  name: 'Get Block',
  key: 'get_block',
  description:
    'Read a block by its exact UID, including native content, display properties, parent and child UIDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      blockUid: z
        .string()
        .describe('Exact block UID from search_blocks, pull_data or a create result')
    })
  )
  .output(
    z.object({
      blockUid: z.string(),
      block: z.unknown().describe('Native block map, or null if absent')
    })
  )
  .handleInvocation(async ctx => {
    const client = new RoamClient({ graphName: ctx.config.graphName, token: ctx.auth.token });
    const block = await client.entity(ctx.input.blockUid);
    if (block && typeof block[':block/string'] !== 'string')
      fail('The exact UID identifies a page rather than a block.');
    return {
      output: { blockUid: ctx.input.blockUid, block },
      message: block ? 'Read the exact block.' : 'The exact block was not found.'
    };
  })
  .build();
