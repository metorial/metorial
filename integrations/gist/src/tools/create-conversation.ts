import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

export let createConversation = SlateTool.create(spec, {
  name: 'Create Conversation',
  key: 'create_conversation',
  description: `Start a new conversation in Gist with a contact. Optionally assign it to a teammate or team and set priority.`
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to start a conversation with'),
      subject: z.string().optional().describe('Conversation subject'),
      body: z.string().describe('Initial message body (HTML supported)'),
      assigneeId: z.string().optional().describe('Teammate ID to assign the conversation to'),
      teamId: z.string().optional().describe('Team ID to assign the conversation to')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Created conversation ID'),
      subject: z.string().optional(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    let body: Record<string, any> = {
      contact_id: ctx.input.contactId,
      body: ctx.input.body
    };
    if (ctx.input.subject) body.subject = ctx.input.subject;
    if (ctx.input.assigneeId) body.assignee_id = ctx.input.assigneeId;
    if (ctx.input.teamId) body.team_id = ctx.input.teamId;

    let data = await client.createConversation(body);
    let conv = data.conversation || data;

    return {
      output: {
        conversationId: String(conv.id),
        subject: conv.subject,
        status: conv.status
      },
      message: `Created conversation **${conv.subject || conv.id}** with contact ${ctx.input.contactId}.`
    };
  })
  .build();
