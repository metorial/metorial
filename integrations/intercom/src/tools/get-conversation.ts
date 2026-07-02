import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { booleanOrUndefined, stringOrUndefined, timestampOrUndefined } from '../lib/output';
import { spec } from '../spec';

export let getConversation = SlateTool.create(spec, {
  name: 'Get Conversation',
  key: 'get_conversation',
  description: `Retrieve a single conversation with full details including the source message and all conversation parts (replies, notes, assignments, etc.). Limited to 500 parts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('Intercom conversation ID')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Conversation ID'),
      state: z.string().optional().describe('Conversation state (open, closed, snoozed)'),
      title: z.string().optional().describe('Conversation title'),
      open: z.boolean().optional().describe('Whether conversation is open'),
      read: z.boolean().optional().describe('Whether conversation has been read'),
      priority: z.string().optional().describe('Conversation priority'),
      waitingSince: z
        .string()
        .optional()
        .describe('Timestamp of when customer started waiting'),
      snoozedUntil: z.string().optional().describe('Snoozed until timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      sourceType: z.string().optional().describe('Source message type'),
      sourceAuthorType: z.string().optional().describe('Source author type'),
      sourceAuthorId: z.string().optional().describe('Source author ID'),
      sourceAuthorName: z.string().optional().describe('Source author name'),
      sourceAuthorEmail: z.string().optional().describe('Source author email'),
      sourceBody: z.string().optional().describe('Source message body'),
      sourceSubject: z.string().optional().describe('Source message subject'),
      sourceUrl: z.string().optional().describe('Source URL'),
      assigneeId: z.string().optional().describe('Current assignee ID'),
      assigneeType: z.string().optional().describe('Current assignee type'),
      contacts: z
        .array(
          z.object({
            contactId: z.string().describe('Contact ID'),
            type: z.string().optional().describe('Contact type')
          })
        )
        .optional()
        .describe('Contacts involved in the conversation'),
      teammates: z
        .array(
          z.object({
            adminId: z.string().describe('Admin ID'),
            type: z.string().optional().describe('Admin type')
          })
        )
        .optional()
        .describe('Teammates involved'),
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('Tag ID'),
            name: z.string().optional().describe('Tag name')
          })
        )
        .optional()
        .describe('Applied tags'),
      conversationParts: z
        .array(
          z.object({
            partId: z.string().describe('Part ID'),
            partType: z.string().optional().describe('Part type'),
            body: z.string().optional().describe('Part body'),
            authorType: z.string().optional().describe('Author type'),
            authorId: z.string().optional().describe('Author ID'),
            authorName: z.string().optional().describe('Author name'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('Conversation parts (replies, notes, etc.)'),
      aiAgentParticipated: z.boolean().optional().describe('Whether AI agent participated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.getConversation(ctx.input.conversationId);

    let parts = (result.conversation_parts?.conversation_parts || []).map((p: any) => ({
      partId: String(p.id),
      partType: stringOrUndefined(p.part_type),
      body: stringOrUndefined(p.body),
      authorType: stringOrUndefined(p.author?.type),
      authorId: p.author?.id ? String(p.author.id) : undefined,
      authorName: stringOrUndefined(p.author?.name),
      createdAt: timestampOrUndefined(p.created_at)
    }));

    return {
      output: {
        conversationId: String(result.id),
        state: stringOrUndefined(result.state),
        title: stringOrUndefined(result.title),
        open: booleanOrUndefined(result.open),
        read: booleanOrUndefined(result.read),
        priority: stringOrUndefined(result.priority),
        waitingSince: timestampOrUndefined(result.waiting_since),
        snoozedUntil: timestampOrUndefined(result.snoozed_until),
        createdAt: timestampOrUndefined(result.created_at),
        updatedAt: timestampOrUndefined(result.updated_at),
        sourceType: stringOrUndefined(result.source?.type),
        sourceAuthorType: stringOrUndefined(result.source?.author?.type),
        sourceAuthorId: result.source?.author?.id
          ? String(result.source.author.id)
          : undefined,
        sourceAuthorName: stringOrUndefined(result.source?.author?.name),
        sourceAuthorEmail: stringOrUndefined(result.source?.author?.email),
        sourceBody: stringOrUndefined(result.source?.body),
        sourceSubject: stringOrUndefined(result.source?.subject),
        sourceUrl: stringOrUndefined(result.source?.url),
        assigneeId: result.assignee?.id ? String(result.assignee.id) : undefined,
        assigneeType: stringOrUndefined(result.assignee?.type),
        contacts: (result.contacts?.contacts || []).map((c: any) => ({
          contactId: String(c.id),
          type: stringOrUndefined(c.type)
        })),
        teammates: (result.teammates?.admins || []).map((a: any) => ({
          adminId: String(a.id),
          type: stringOrUndefined(a.type)
        })),
        tags: (result.tags?.tags || []).map((t: any) => ({
          tagId: String(t.id),
          name: stringOrUndefined(t.name)
        })),
        conversationParts: parts,
        aiAgentParticipated: booleanOrUndefined(result.ai_agent_participated)
      },
      message: `Retrieved conversation **${result.id}** (${result.state}, ${parts.length} parts)`
    };
  })
  .build();
