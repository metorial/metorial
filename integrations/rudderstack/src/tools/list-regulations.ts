import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let listRegulations = SlateTool.create(spec, {
  name: 'List Regulations',
  key: 'list_regulations',
  description: `Retrieve all user suppression regulations created via the User Suppression API, or delete a specific regulation by its ID. Useful for reviewing compliance actions and managing existing regulations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of regulations to return'),
      offset: z.number().optional().describe('Number of regulations to skip')
    })
  )
  .output(
    z.object({
      regulations: z.array(z.record(z.string(), z.any())).describe('List of regulations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listRegulations({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let list = result.regulations || result;

    return {
      output: { regulations: Array.isArray(list) ? list : [] },
      message: `Found **${Array.isArray(list) ? list.length : 0}** regulation(s).`
    };
  })
  .build();
