import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let deleteVariable = SlateTool.create(spec, {
  name: 'Delete Variable',
  key: 'delete_variable',
  description: `Permanently delete a runtime variable from Flowise by its ID. This action cannot be undone.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      variableId: z.string().describe('ID of the variable to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    await client.deleteVariable(ctx.input.variableId);

    return {
      output: { success: true },
      message: `Deleted variable \`${ctx.input.variableId}\`.`
    };
  })
  .build();
