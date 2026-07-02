import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let noteUpdatesPollTrigger = SlateTrigger.create(spec, {
  name: 'Note Updates (Polling)',
  key: 'note_updates_poll',
  description:
    "[Polling fallback] Polls for recently created or updated notes using Evernote's search API. Detects new and modified notes since the last poll."
})
  .input(
    z.object({
      noteGuid: z.string().describe('GUID of the note'),
      title: z.string().optional().describe('Title of the note'),
      notebookGuid: z.string().optional().describe('GUID of the notebook containing the note'),
      updatedAt: z
        .string()
        .optional()
        .describe('ISO timestamp when the note was last updated'),
      isNew: z.boolean().describe('Whether this note was newly created since last poll')
    })
  )
  .output(
    z.object({
      noteGuid: z.string().describe('GUID of the affected note'),
      title: z.string().optional().describe('Title of the note'),
      notebookGuid: z.string().optional().describe('GUID of the containing notebook'),
      tagGuids: z.array(z.string()).optional().describe('Tag GUIDs on this note'),
      createdAt: z.string().optional().describe('ISO timestamp when the note was created'),
      updatedAt: z.string().optional().describe('ISO timestamp when the note was last updated')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        noteStoreUrl: ctx.auth.noteStoreUrl
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let lastUpdateCount = ctx.state?.lastUpdateCount as number | undefined;

      // Get current sync state to check if anything changed
      let syncState = await client.getSyncState();

      if (lastUpdateCount !== undefined && syncState.updateCount <= lastUpdateCount) {
        // No changes since last poll
        return {
          inputs: [],
          updatedState: {
            lastPollTime: new Date().toISOString(),
            lastUpdateCount: syncState.updateCount
          }
        };
      }

      // Search for recently updated notes
      let searchFilter: Record<string, any> = {};
      if (lastPollTime) {
        // Convert ISO string to Evernote date format (YYYYMMDD'T'HHmmss)
        let d = new Date(lastPollTime);
        let dateStr = d
          .toISOString()
          .replace(/[-:]/g, '')
          .replace(/\.\d{3}Z$/, 'Z');
        searchFilter.words = `updated:${dateStr}`;
      }

      let result = await client.findNotesMetadata(
        {
          words: searchFilter.words,
          order: 2, // Sort by updated
          ascending: false
        },
        0,
        100,
        {
          includeTitle: true,
          includeCreated: true,
          includeUpdated: true,
          includeNotebookGuid: true,
          includeTagGuids: true
        }
      );

      let inputs = result.notes.map(note => {
        let isNew = lastPollTime
          ? note.created !== undefined && note.created >= new Date(lastPollTime).getTime()
          : false;

        return {
          noteGuid: note.noteGuid,
          title: note.title,
          notebookGuid: note.notebookGuid,
          updatedAt: note.updated ? new Date(note.updated).toISOString() : undefined,
          isNew
        };
      });

      return {
        inputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          lastUpdateCount: syncState.updateCount
        }
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        noteStoreUrl: ctx.auth.noteStoreUrl
      });

      // Fetch full note metadata
      let note: { createdAt?: string; tagGuids?: string[] } = {};
      try {
        let fullNote = await client.getNoteWithResultSpec(ctx.input.noteGuid, {
          includeContent: false,
          includeResourcesData: false,
          includeResourcesRecognition: false,
          includeResourcesAlternateData: false
        });
        note.createdAt = fullNote.created
          ? new Date(fullNote.created).toISOString()
          : undefined;
        note.tagGuids = fullNote.tagGuids;
      } catch {
        // Use what we have from the poll input
      }

      let eventType = ctx.input.isNew ? 'note.created' : 'note.updated';

      return {
        type: eventType,
        id: `${ctx.input.noteGuid}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          noteGuid: ctx.input.noteGuid,
          title: ctx.input.title,
          notebookGuid: ctx.input.notebookGuid,
          tagGuids: note.tagGuids,
          createdAt: note.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
