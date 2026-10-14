import { SlateTool } from 'slates';
import { z } from 'zod';
import { ParmaClient } from '../lib/client';
import { spec } from '../spec';

export let listRelationshipNotes = SlateTool.create(spec, {
  name: 'List Relationship Notes',
  key: 'list_relationship_notes',
  description:
    'Read one page of notes for a Parma relationship, including content, linked relationship IDs, and interaction timestamps. Use search_relationships to discover the relationship ID.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      relationshipId: z.string().describe('Relationship ID from search_relationships'),
      page: z.number().int().min(1).optional().describe('Page number, starting at 1')
    })
  )
  .output(
    z.object({
      notes: z.array(
        z.object({
          noteId: z.string(),
          content: z.string(),
          relationshipIds: z.array(z.string()),
          datetime: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let notes = await new ParmaClient(ctx.auth.token).listNotes(
      ctx.input.relationshipId,
      ctx.input.page
    );
    return {
      message: `Retrieved **${notes.length}** note(s).`,
      output: {
        notes: notes.map(note => ({
          noteId: String(note.id),
          content: note.body,
          relationshipIds: note.relationship_ids.map(String),
          datetime: note.datetime,
          createdAt: note.created_at,
          updatedAt: note.updated_at
        }))
      }
    };
  })
  .build();
