import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTool = SlateTool.create(spec, {
  name: 'Delete Tool',
  key: 'delete_tool',
  description: `Permanently delete a custom tool from Flowise by its ID. This action cannot be undone.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      toolId: z.string().describe('ID of the tool to delete')
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

    await client.deleteTool(ctx.input.toolId);

    return {
      output: { success: true },
      message: `Deleted tool \`${ctx.input.toolId}\`.`
    };
  })
  .build();
