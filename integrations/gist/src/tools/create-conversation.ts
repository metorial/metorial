import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId, requireValue } from '../lib/response';
import { spec } from '../spec';

export let createConversation = SlateTool.create(spec, {
  name: 'Create Conversation',
  key: 'create_conversation',
  description: `Start a new conversation in Gist with a contact. Optionally assign it to a teammate or team and provide the acting teammate.`
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to start a conversation with'),
      subject: z.string().optional().describe('Conversation subject'),
      body: z.string().describe('Initial plain text message body'),
      assigneeId: z.string().optional().describe('Teammate ID to assign the conversation to'),
      teamId: z.string().optional().describe('Team ID to assign the conversation to'),
      teammateId: z
        .string()
        .optional()
        .describe(
          'Acting teammate ID, required when assigning. Call list_teams to discover teammates.'
        )
    })
  )
  .output(
    z.object({
      rawResponse: z.any().optional().describe('Complete provider response data'),
      conversationId: z.string().describe('Created conversation ID'),
      subject: z.string().optional(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    if (ctx.input.assigneeId || ctx.input.teamId)
      requireValue(ctx.input.teammateId, 'teammateId when assigning a conversation');
    let body: Record<string, any> = {
      from: { id: ctx.input.contactId },
      body: ctx.input.body
    };
    if (ctx.input.subject) body.title = ctx.input.subject;

    let data = await client.createConversation(body);
    let conv = data.conversation || data;
    if (ctx.input.assigneeId || ctx.input.teamId) {
      await client.assignConversation(requiredId(conv.id), {
        teammate_id: requireValue(
          ctx.input.teammateId,
          'teammateId when assigning a conversation'
        ),
        assignee_id: ctx.input.teamId ?? ctx.input.assigneeId,
        assignee_type: ctx.input.teamId ? 'team' : 'teammate'
      });
    }

    return {
      output: {
        rawResponse: client.responses,
        conversationId: requiredId(conv.id),
        subject: conv.subject,
        status: conv.status
      },
      message: `Created conversation **${conv.subject || conv.id}** with contact ${ctx.input.contactId}.`
    };
  })
  .build();
