import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let auditKnowledgeBase = SlateTool.create(spec, {
  name: 'Audit Knowledge Base',
  key: 'audit_knowledge_base',
  description: `Audit workspace content health by listing notes in various categories: all notes, publicly shared notes, inactive notes, or empty notes. Useful for identifying stale, missing, or publicly exposed documentation.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      category: z
        .enum(['all', 'public', 'inactive', 'empty'])
        .describe('Category of notes to list'),
      reviewStateList: z
        .array(
          z.enum(['Verified', 'Outdated', 'VerificationRequested', 'VerificationExpired'])
        )
        .optional()
        .describe('Filter by review states (not available for inactive/empty)'),
      ownerIdList: z.array(z.string()).optional().describe('Filter by owner user IDs'),
      channelIdList: z.array(z.string()).optional().describe('Filter by channel IDs'),
      sinceDaysAgo: z.number().optional().describe('Only include notes from the last N days'),
      first: z.number().optional().describe('Maximum number of results (1-50, default 20)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      notes: z.array(
        z.object({
          noteId: z.string().describe('ID of the note'),
          title: z.string().describe('Title of the note'),
          url: z.string().describe('URL to view the note'),
          updatedAt: z.string().describe('Last update timestamp'),
          lastEditedAt: z.string().describe('Last content edit timestamp'),
          reviewState: z.string().optional().describe('Review state'),
          owner: z
            .object({
              userId: z.string().optional(),
              groupId: z.string().optional()
            })
            .optional()
            .describe('Note owner')
        })
      ),
      total: z.number().describe('Total number of matching notes'),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      nextCursor: z.string().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let params = {
      reviewStateList: ctx.input.reviewStateList,
      ownerIdList: ctx.input.ownerIdList,
      channelIdList: ctx.input.channelIdList,
      sinceDaysAgo: ctx.input.sinceDaysAgo,
      first: ctx.input.first,
      cursor: ctx.input.cursor
    };

    let result: any;
    switch (ctx.input.category) {
      case 'all':
        result = await client.listKnowledgeManagementNotes(params);
        break;
      case 'public':
        result = await client.listPublicNotes(params);
        break;
      case 'inactive':
        result = await client.listInactiveNotes(params);
        break;
      case 'empty':
        result = await client.listEmptyNotes(params);
        break;
    }

    let notes = (result.notes || []).map((note: any) => ({
      noteId: note.id,
      title: note.title,
      url: note.url,
      updatedAt: note.updatedAt,
      lastEditedAt: note.lastEditedAt,
      reviewState: note.reviewState,
      owner: note.owner
    }));

    return {
      output: {
        notes,
        total: result.total ?? notes.length,
        hasNextPage: result.hasNextPage ?? false,
        nextCursor: result.nextCursor ?? null
      },
      message: `Found **${notes.length}** ${ctx.input.category} note(s) (total: ${result.total ?? notes.length})${result.hasNextPage ? ' — more results available' : ''}`
    };
  })
  .build();
