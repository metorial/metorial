import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateStringVariable = SlateTool.create(spec, {
  name: 'Update String Variable',
  key: 'update_string_variable',
  description: `Set or clear a string variable in Apilio. Provide a **value** to set the variable, or omit it to clear the stored text. String variables can hold any text value used in automation conditions.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      variableId: z.string().describe('ID (UUID) of the string variable to update'),
      value: z
        .string()
        .nullable()
        .optional()
        .describe('New text value to set. Pass null or omit to clear the variable.')
    })
  )
  .output(
    z.object({
      variableId: z.string().describe('ID of the updated string variable'),
      name: z.string().describe('Name of the string variable'),
      value: z.string().nullable().describe('New value after update, or null if cleared'),
      updatedAt: z.string().describe('When the variable was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let newValue = ctx.input.value ?? null;
    let updated = await client.updateStringVariable(ctx.input.variableId, newValue);

    return {
      output: {
        variableId: updated.id,
        name: updated.name,
        value: updated.value,
        updatedAt: updated.updated_at
      },
      message:
        newValue === null
          ? `String variable **${updated.name}** cleared.`
          : `String variable **${updated.name}** set to **"${updated.value}"**.`
    };
  })
  .build();
