import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateBooleanVariable = SlateTool.create(spec, {
  name: 'Update Boolean Variable',
  key: 'update_boolean_variable',
  description: `Set, toggle, or update a boolean variable in Apilio. Use **set** to assign true or false directly, or **toggle** to flip the current value. Boolean variables are commonly used to track device states and home/away status.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      variableId: z.string().describe('ID (UUID) of the boolean variable to update'),
      action: z
        .enum(['set_true', 'set_false', 'toggle'])
        .describe('Action to perform: set_true, set_false, or toggle the current value')
    })
  )
  .output(
    z.object({
      variableId: z.string().describe('ID of the updated boolean variable'),
      name: z.string().describe('Name of the boolean variable'),
      value: z.boolean().describe('New value after update'),
      updatedAt: z.string().describe('When the variable was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let newValue: boolean;
    if (ctx.input.action === 'toggle') {
      let current = await client.getBooleanVariable(ctx.input.variableId);
      newValue = !current.value;
    } else {
      newValue = ctx.input.action === 'set_true';
    }

    let updated = await client.updateBooleanVariable(ctx.input.variableId, newValue);

    return {
      output: {
        variableId: updated.id,
        name: updated.name,
        value: updated.value,
        updatedAt: updated.updated_at
      },
      message: `Boolean variable **${updated.name}** ${ctx.input.action === 'toggle' ? 'toggled' : 'set'} to **${updated.value}**.`
    };
  })
  .build();
