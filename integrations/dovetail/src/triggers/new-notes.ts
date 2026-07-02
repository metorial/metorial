import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newNotes = SlateTrigger.create(spec, {
  name: 'New Notes',
  key: 'new_notes',
  description: 'Triggers when new research notes are created in the Dovetail workspace.'
})
  .input(
    z.object({
      noteId: z.string(),
      title: z.string(),
      previewText: z.string().nullable().optional(),
      projectId: z.string().nullable().optional(),
      projectTitle: z.string().nullable().optional(),
      authorId: z.string().nullable().optional(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('ID of the new note'),
      title: z.string().describe('Title of the note'),
      previewText: z.string().nullable().optional().describe('Preview text of the note'),
      projectId: z.string().nullable().optional().describe('Associated project ID'),
      projectTitle: z.string().nullable().optional().describe('Associated project title'),
      authorId: z.string().nullable().optional().describe('Author user ID'),
      createdAt: z.string().describe('Note creation timestamp'),
      updatedAt: z.string().describe('Note last updated timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let state = ctx.state as { lastSeenAt?: string } | null;

      let params: Record<string, unknown> = {
        sort: 'created_at:desc',
        limit: 50
      };

      if (state?.lastSeenAt) {
        params.createdAfter = state.lastSeenAt;
      }

      let result = await client.listNotes(params as any);

      let notes = result.data;

      let firstNote = notes[0];
      let newLastSeenAt = firstNote ? firstNote.created_at : state?.lastSeenAt;

      // On first run (no state), don't emit events, just record the cursor
      if (!state?.lastSeenAt) {
        return {
          inputs: [],
          updatedState: { lastSeenAt: newLastSeenAt }
        };
      }

      let inputs = notes.map(n => ({
        noteId: n.id,
        title: n.title,
        previewText: n.preview_text ?? null,
        projectId: n.project_id ?? null,
        projectTitle: n.project_title ?? null,
        authorId: n.author_id ?? null,
        createdAt: n.created_at,
        updatedAt: n.updated_at
      }));

      return {
        inputs,
        updatedState: { lastSeenAt: newLastSeenAt }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'note.created',
        id: ctx.input.noteId,
        output: {
          noteId: ctx.input.noteId,
          title: ctx.input.title,
          previewText: ctx.input.previewText,
          projectId: ctx.input.projectId,
          projectTitle: ctx.input.projectTitle,
          authorId: ctx.input.authorId,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
