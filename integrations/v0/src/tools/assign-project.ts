import { SlateTool } from 'slates';
import { z } from 'zod';
import { V0Client } from '../lib/client';
import { spec } from '../spec';

export let assignProjectToChatTool = SlateTool.create(spec, {
  name: 'Assign Project to Chat',
  key: 'assign_project_to_chat',
  description: `Link an existing V0 project to a specific chat. This groups the conversation under a shared project context, enabling deployment and environment variable sharing.`
})
  .input(
    z.object({
      projectId: z.string().describe('The project to assign'),
      chatId: z.string().describe('The chat to associate with the project')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('The assigned project ID'),
      chatId: z.string().describe('The associated chat ID'),
      assigned: z.boolean().describe('Whether the assignment was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    await client.assignProjectToChat(ctx.input.projectId, ctx.input.chatId);

    return {
      output: {
        projectId: ctx.input.projectId,
        chatId: ctx.input.chatId,
        assigned: true
      },
      message: `Assigned project ${ctx.input.projectId} to chat ${ctx.input.chatId}.`
    };
  })
  .build();
