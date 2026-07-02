import { SlateTool } from 'slates';
import { z } from 'zod';
import { MeetClient } from '../lib/client';
import { googleMeetActionScopes } from '../scopes';
import { spec } from '../spec';

let smartNoteSchema = z.object({
  smartNoteName: z.string().describe('Resource name of the smart notes'),
  state: z.string().optional().describe('Current state: STARTED, ENDED, or FILE_GENERATED'),
  startTime: z.string().optional().describe('When smart notes started'),
  endTime: z.string().optional().describe('When smart notes ended'),
  docsId: z.string().optional().describe('Google Docs document ID for the smart notes'),
  docsUri: z.string().optional().describe('URI to view the smart notes document')
});

let mapSmartNote = (smartNote: any) => ({
  smartNoteName: smartNote.name || '',
  state: smartNote.state,
  startTime: smartNote.startTime,
  endTime: smartNote.endTime,
  docsId: smartNote.docsDestination?.document,
  docsUri: smartNote.docsDestination?.exportUri
});

export let listSmartNotesTool = SlateTool.create(spec, {
  name: 'List Smart Notes',
  key: 'list_smart_notes',
  description: `List smart notes generated from a conference record. Smart notes are Gemini meeting notes saved as Google Docs when Take notes for me is enabled.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleMeetActionScopes.listSmartNotes)
  .input(
    z.object({
      conferenceRecordName: z
        .string()
        .describe('Conference record resource name (e.g., "conferenceRecords/abc123")'),
      pageSize: z.number().optional().describe('Maximum number of smart notes to return'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      smartNotes: z.array(smartNoteSchema),
      nextPageToken: z.string().optional().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MeetClient({ token: ctx.auth.token });

    let result = await client.listSmartNotes(
      ctx.input.conferenceRecordName,
      ctx.input.pageSize,
      ctx.input.pageToken
    );

    let smartNotes = result.smartNotes.map(mapSmartNote);

    return {
      output: {
        smartNotes,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${smartNotes.length}** smart note(s).`
    };
  })
  .build();

export let getSmartNoteTool = SlateTool.create(spec, {
  name: 'Get Smart Note',
  key: 'get_smart_note',
  description: `Retrieve metadata for one smart note, including its generation state and Google Docs destination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleMeetActionScopes.getSmartNote)
  .input(
    z.object({
      smartNoteName: z
        .string()
        .describe(
          'Smart note resource name (e.g., "conferenceRecords/abc123/smartNotes/def456")'
        )
    })
  )
  .output(smartNoteSchema)
  .handleInvocation(async ctx => {
    let client = new MeetClient({ token: ctx.auth.token });
    let smartNote = await client.getSmartNote(ctx.input.smartNoteName);
    let output = mapSmartNote(smartNote);

    return {
      output,
      message: `Retrieved smart note **${output.smartNoteName}** (state: ${output.state}).`
    };
  })
  .build();
