import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLogicblocks = SlateTool.create(spec, {
  name: 'List Logicblocks',
  key: 'list_logicblocks',
  description: `Retrieve all logicblocks from your Apilio account. Logicblocks are the core automation units that combine conditions with AND/OR/NOT logic and trigger different action chains based on whether the overall evaluation is positive or negative.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      logicblocks: z
        .array(
          z.object({
            logicblockId: z.string().describe('Unique identifier of the logicblock'),
            name: z.string().describe('Name of the logicblock'),
            active: z.boolean().describe('Whether the logicblock is currently active'),
            result: z
              .boolean()
              .nullable()
              .describe('Last evaluation result, or null if never evaluated'),
            createdAt: z.string().describe('When the logicblock was created'),
            updatedAt: z.string().describe('When the logicblock was last updated')
          })
        )
        .describe('List of all logicblocks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let logicblocks = await client.listLogicblocks();

    let mapped = logicblocks.map(lb => ({
      logicblockId: lb.id,
      name: lb.name,
      active: lb.active,
      result: lb.result,
      createdAt: lb.created_at,
      updatedAt: lb.updated_at
    }));

    let activeCount = mapped.filter(lb => lb.active).length;

    return {
      output: { logicblocks: mapped },
      message: `Found **${mapped.length}** logicblock(s) — **${activeCount}** currently active.`
    };
  })
  .build();
