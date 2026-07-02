import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

let noteSchema = z.object({
  noteId: z.number().describe('Unique identifier of the note'),
  creatorId: z.number().nullable().describe('ID of the note creator'),
  personIds: z.array(z.number()).describe('IDs of associated persons'),
  organizationIds: z.array(z.number()).describe('IDs of associated organizations'),
  opportunityIds: z.array(z.number()).describe('IDs of associated opportunities'),
  content: z.string().nullable().describe('Note content (plain text or HTML)'),
  createdAt: z.string().nullable().describe('When the note was created'),
  updatedAt: z.string().nullable().describe('When the note was last updated')
});

export let listNotes = SlateTool.create(spec, {
  name: 'List Notes',
  key: 'list_notes',
  description: `Retrieve notes from Affinity, optionally filtered by person, organization, or opportunity. Notes can contain plain text or HTML formatting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.number().optional().describe('Filter notes associated with this person'),
      organizationId: z
        .number()
        .optional()
        .describe('Filter notes associated with this organization'),
      opportunityId: z
        .number()
        .optional()
        .describe('Filter notes associated with this opportunity'),
      creatorId: z.number().optional().describe('Filter notes by creator'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      notes: z.array(noteSchema).describe('List of notes'),
      nextPageToken: z.string().nullable().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let result = await client.listNotes({
      personId: ctx.input.personId,
      organizationId: ctx.input.organizationId,
      opportunityId: ctx.input.opportunityId,
      creatorId: ctx.input.creatorId,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let notes = (result.notes ?? result ?? []).map((n: any) => ({
      noteId: n.id,
      creatorId: n.creator_id ?? null,
      personIds: n.person_ids ?? [],
      organizationIds: n.organization_ids ?? [],
      opportunityIds: n.opportunity_ids ?? [],
      content: n.content ?? null,
      createdAt: n.created_at ?? null,
      updatedAt: n.updated_at ?? null
    }));

    return {
      output: {
        notes,
        nextPageToken: result.next_page_token ?? null
      },
      message: `Retrieved **${notes.length}** note(s).`
    };
  })
  .build();

export let createNote = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Create a new note in Affinity and associate it with one or more persons, organizations, or opportunities. Supports plain text and HTML content.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      content: z.string().describe('Note content (plain text or HTML)'),
      personIds: z
        .array(z.number())
        .optional()
        .describe('IDs of persons to associate with this note'),
      organizationIds: z
        .array(z.number())
        .optional()
        .describe('IDs of organizations to associate with this note'),
      opportunityIds: z
        .array(z.number())
        .optional()
        .describe('IDs of opportunities to associate with this note'),
      creatorId: z
        .number()
        .optional()
        .describe('ID of the user to attribute as the note creator'),
      createdAt: z
        .string()
        .optional()
        .describe('Override creation timestamp (ISO 8601 format)')
    })
  )
  .output(noteSchema)
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let n = await client.createNote({
      content: ctx.input.content,
      personIds: ctx.input.personIds,
      organizationIds: ctx.input.organizationIds,
      opportunityIds: ctx.input.opportunityIds,
      creatorId: ctx.input.creatorId,
      createdAt: ctx.input.createdAt
    });

    return {
      output: {
        noteId: n.id,
        creatorId: n.creator_id ?? null,
        personIds: n.person_ids ?? [],
        organizationIds: n.organization_ids ?? [],
        opportunityIds: n.opportunity_ids ?? [],
        content: n.content ?? null,
        createdAt: n.created_at ?? null,
        updatedAt: n.updated_at ?? null
      },
      message: `Created note (ID: ${n.id}).`
    };
  })
  .build();

export let updateNote = SlateTool.create(spec, {
  name: 'Update Note',
  key: 'update_note',
  description: `Update the content of an existing note in Affinity.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      noteId: z.number().describe('ID of the note to update'),
      content: z.string().describe('New note content (plain text or HTML)')
    })
  )
  .output(noteSchema)
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let n = await client.updateNote(ctx.input.noteId, {
      content: ctx.input.content
    });

    return {
      output: {
        noteId: n.id,
        creatorId: n.creator_id ?? null,
        personIds: n.person_ids ?? [],
        organizationIds: n.organization_ids ?? [],
        opportunityIds: n.opportunity_ids ?? [],
        content: n.content ?? null,
        createdAt: n.created_at ?? null,
        updatedAt: n.updated_at ?? null
      },
      message: `Updated note (ID: ${n.id}).`
    };
  })
  .build();

export let deleteNote = SlateTool.create(spec, {
  name: 'Delete Note',
  key: 'delete_note',
  description: `Permanently delete a note from Affinity.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      noteId: z.number().describe('ID of the note to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    await client.deleteNote(ctx.input.noteId);

    return {
      output: { success: true },
      message: `Deleted note with ID **${ctx.input.noteId}**.`
    };
  })
  .build();
