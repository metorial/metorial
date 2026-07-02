import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClientFromContext, requireServiceAccount } from '../lib/helpers';
import { spec } from '../spec';

export let listFunnels = SlateTool.create(spec, {
  name: 'List Funnels',
  key: 'list_funnels',
  description: `List all saved funnels in the Mixpanel project. Returns funnel IDs and names that can be used with the **Query Funnel** tool.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      funnels: z
        .array(
          z.object({
            funnelId: z.number().describe('Funnel ID'),
            name: z.string().describe('Funnel name')
          })
        )
        .describe('List of saved funnels')
    })
  )
  .handleInvocation(async ctx => {
    requireServiceAccount(ctx);

    let client = createClientFromContext(ctx);
    let funnels = await client.listFunnels();

    return {
      output: { funnels },
      message: `Found **${funnels.length}** saved funnel(s).`
    };
  })
  .build();
