import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendCampfireMessageTool = SlateTool.create(spec, {
  name: 'Send Campfire Message',
  key: 'send_campfire_message',
  description: `Send a message to a Basecamp Campfire (group chat). Campfires are real-time chat rooms within projects.`,
  instructions: ['Use Get Project to find the chat dock item and its ID for the campfire.']
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project (bucket)'),
      campfireId: z.string().describe('ID of the campfire (chat dock item ID from project)'),
      content: z.string().describe('Message content (supports HTML)')
    })
  )
  .output(
    z.object({
      lineId: z.number().describe('ID of the campfire message'),
      content: z.string().describe('Content of the message'),
      createdAt: z.string().describe('When the message was sent'),
      creatorName: z.string().nullable().describe('Name of the message sender')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let line = await client.createCampfireLine(ctx.input.projectId, ctx.input.campfireId, {
      content: ctx.input.content
    });

    return {
      output: {
        lineId: line.id,
        content: line.content,
        createdAt: line.created_at,
        creatorName: line.creator?.name ?? null
      },
      message: `Sent campfire message.`
    };
  })
  .build();
