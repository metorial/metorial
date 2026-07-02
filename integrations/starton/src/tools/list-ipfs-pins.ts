import { SlateTool } from 'slates';
import { z } from 'zod';
import { StartonClient } from '../lib/client';
import { spec } from '../spec';

export let listIpfsPins = SlateTool.create(spec, {
  name: 'List IPFS Pins',
  key: 'list_ipfs_pins',
  description: `List content pinned to IPFS in your Starton project. Returns pin details including CIDs and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().default(20).describe('Number of pins to return'),
      page: z.number().default(0).describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      pins: z
        .array(
          z.object({
            pinId: z.string().describe('Pin identifier'),
            cid: z.string().describe('IPFS content identifier'),
            name: z.string().optional().describe('Pin name'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of IPFS pins'),
      totalCount: z.number().optional().describe('Total number of pins')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StartonClient({ token: ctx.auth.token });

    let result = await client.listIpfsPins({
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let items = result.items || result || [];

    return {
      output: {
        pins: items.map((p: any) => ({
          pinId: p.id || '',
          cid: p.cid || p.pinStatus?.pin?.cid || '',
          name: p.name,
          createdAt: p.createdAt
        })),
        totalCount: result.meta?.totalCount || items.length
      },
      message: `Found **${items.length}** IPFS pins.`
    };
  })
  .build();
