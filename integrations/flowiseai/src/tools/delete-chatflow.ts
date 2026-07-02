import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let deleteChatflow = SlateTool.create(spec, {
  name: 'Delete Chatflow',
  key: 'delete_chatflow',
  description: `Permanently delete a chatflow from Flowise by its ID. This action cannot be undone.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      chatflowId: z.string().describe('ID of the chatflow to delete')
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

    await client.deleteChatflow(ctx.input.chatflowId);

    return {
      output: {
        success: true
      },
      message: `Deleted chatflow \`${ctx.input.chatflowId}\`.`
    };
  })
  .build();
