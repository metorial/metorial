import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listRegistries = SlateTool.create(spec, {
  name: 'List Revocation Registries',
  key: 'list_registries',
  description: `Retrieve all revocation registries owned by the authenticated account. Registries manage the revocation status of verifiable credentials.`,
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
      registries: z.array(
        z.object({
          registryId: z.string().describe('Registry identifier'),
          registryType: z.string().optional().describe('Registry type'),
          policy: z.array(z.string()).optional().describe('Controlling DIDs'),
          addOnly: z.boolean().optional().describe('Whether only revocations are allowed'),
          createdAt: z.string().optional().describe('Creation timestamp')
        })
      ),
      total: z.number().optional().describe('Total number of registries')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listRegistries({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let list = Array.isArray(result) ? result : result?.list || [];
    let total = result?.total;

    let registries = list.map((r: any) => ({
      registryId: r.id || '',
      registryType: r.type,
      policy: r.policy,
      addOnly: r.addOnly,
      createdAt: r.created || r.createdAt
    }));

    return {
      output: { registries, total },
      message: `Found **${registries.length}** revocation registry(ies)${total != null ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
