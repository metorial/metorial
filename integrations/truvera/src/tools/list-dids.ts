import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listDids = SlateTool.create(spec, {
  name: 'List DIDs',
  key: 'list_dids',
  description: `Retrieve all decentralized identifiers (DIDs) controlled by the authenticated account. Returns DID identifiers along with their type, controller, and credential count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Number of items to skip for pagination'),
      limit: z.number().optional().describe('Maximum number of items to return (max 64)')
    })
  )
  .output(
    z.object({
      dids: z.array(
        z.object({
          did: z.string().describe('DID identifier'),
          didType: z.string().optional().describe('DID method type'),
          controller: z.string().optional().describe('Controller DID'),
          credentialCount: z
            .number()
            .optional()
            .describe('Number of credentials associated with this DID')
        })
      ),
      total: z.number().optional().describe('Total number of DIDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listDids({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let list = Array.isArray(result) ? result : result?.list || [];
    let total = result?.total;

    let dids = list.map((d: any) => ({
      did: d.did || d.id || '',
      didType: d.type,
      controller: d.controller,
      credentialCount: d.credentialCount
    }));

    return {
      output: { dids, total },
      message: `Found **${dids.length}** DID(s)${total != null ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
