import { SlateTool } from 'slates';
import { z } from 'zod';
import { CloudAgentsClient } from '../lib/client';
import { spec } from '../spec';

export let followUpAgent = SlateTool.create(spec, {
  name: 'Follow Up Agent',
  key: 'follow_up_agent',
  description: `Send a follow-up instruction to a running or stopped Cursor cloud agent. Use this to iterate on the agent's work, request modifications, or provide clarifications. Sending a follow-up to a stopped agent will resume it.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      agentId: z.string().describe('ID of the agent to send a follow-up to'),
      promptText: z.string().describe('Follow-up instruction text'),
      promptImages: z
        .array(
          z.object({
            data: z.string().describe('Base64-encoded image data'),
            dimension: z.object({
              width: z.number().describe('Image width in pixels'),
              height: z.number().describe('Image height in pixels')
            })
          })
        )
        .max(5)
        .optional()
        .describe('Up to 5 images to include')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('ID of the agent that received the follow-up')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CloudAgentsClient({ token: ctx.auth.token });
    let result = await client.addFollowUp(ctx.input.agentId, {
      text: ctx.input.promptText,
      images: ctx.input.promptImages
    });

    return {
      output: {
        agentId: result.id
      },
      message: `Follow-up sent to agent **${result.id}**.`
    };
  })
  .build();
