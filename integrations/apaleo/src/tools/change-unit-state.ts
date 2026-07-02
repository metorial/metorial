import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

export let changeUnitState = SlateTool.create(spec, {
  name: 'Change Room Condition',
  key: 'change_unit_state',
  description: `Update the housekeeping condition of a room (unit). Set a room to Clean, Dirty, or CleanToBeInspected. Commonly used by housekeeping apps to update room status after cleaning.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      unitId: z.string().describe('Room/unit ID'),
      condition: z
        .enum(['Clean', 'Dirty', 'CleanToBeInspected'])
        .describe('New room condition')
    })
  )
  .output(
    z.object({
      unitId: z.string().describe('Room ID'),
      condition: z.string().describe('Updated condition')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApaleoClient(ctx.auth.token);
    await client.changeUnitState(ctx.input.unitId, ctx.input.condition);

    return {
      output: {
        unitId: ctx.input.unitId,
        condition: ctx.input.condition
      },
      message: `Room **${ctx.input.unitId}** condition set to **${ctx.input.condition}**.`
    };
  })
  .build();
