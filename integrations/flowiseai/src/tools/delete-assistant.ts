import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let deleteAssistant = SlateTool.create(spec, {
  name: 'Delete Assistant',
  key: 'delete_assistant',
  description: `Permanently delete an AI assistant from Flowise by its ID. This action cannot be undone.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      assistantId: z.string().describe('ID of the assistant to delete')
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

    await client.deleteAssistant(ctx.input.assistantId);

    return {
      output: {
        success: true
      },
      message: `Deleted assistant \`${ctx.input.assistantId}\`.`
    };
  })
  .build();
