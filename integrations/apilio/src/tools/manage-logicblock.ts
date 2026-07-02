import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLogicblock = SlateTool.create(spec, {
  name: 'Manage Logicblock',
  key: 'manage_logicblock',
  description: `Activate or deactivate a logicblock in Apilio. Active logicblocks will execute their action chains when evaluated; inactive logicblocks can still be evaluated but their actions will not run. This acts as an on/off switch for your automation logic.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      logicblockId: z.string().describe('ID (UUID) of the logicblock to manage'),
      active: z
        .boolean()
        .describe('Set to true to activate or false to deactivate the logicblock')
    })
  )
  .output(
    z.object({
      logicblockId: z.string().describe('ID of the managed logicblock'),
      name: z.string().describe('Name of the logicblock'),
      active: z.boolean().describe('New active state of the logicblock'),
      result: z.boolean().nullable().describe('Last evaluation result'),
      updatedAt: z.string().describe('When the logicblock was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let logicblock = await client.updateLogicblockActive(
      ctx.input.logicblockId,
      ctx.input.active
    );

    return {
      output: {
        logicblockId: logicblock.id,
        name: logicblock.name,
        active: logicblock.active,
        result: logicblock.result,
        updatedAt: logicblock.updated_at
      },
      message: `Logicblock **${logicblock.name}** is now **${logicblock.active ? 'active' : 'inactive'}**.`
    };
  })
  .build();
