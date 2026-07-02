import { SlateTool } from 'slates';
import { z } from 'zod';
import { BiginClient } from '../lib/client';
import { spec } from '../spec';

export let listNotes = SlateTool.create(spec, {
  name: 'List Notes',
  key: 'list_notes',
  description: `Retrieve all notes associated with a specific record in any Bigin module. Returns note title, content, creation time, and owner information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z
        .enum(['Contacts', 'Accounts', 'Pipelines', 'Products', 'Tasks', 'Events', 'Calls'])
        .describe('Module API name of the parent record'),
      recordId: z.string().describe('ID of the record to retrieve notes for'),
      page: z.number().optional().describe('Page number (default 1)'),
      perPage: z.number().optional().describe('Notes per page (default 200, max 200)')
    })
  )
  .output(
    z.object({
      notes: z.array(z.record(z.string(), z.any())).describe('Array of note objects'),
      moreRecords: z.boolean().optional().describe('Whether more notes are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.getNotes(ctx.input.module, ctx.input.recordId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let notes = result.data || [];
    let info = result.info || {};

    return {
      output: {
        notes,
        moreRecords: info.more_records
      },
      message: `Retrieved **${notes.length}** note(s) for record **${ctx.input.recordId}** in **${ctx.input.module}**.`
    };
  })
  .build();

export let createNote = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Add a note to a specific record in any Bigin module. Notes can include a title and content body.`
})
  .input(
    z.object({
      module: z
        .enum(['Contacts', 'Accounts', 'Pipelines', 'Products', 'Tasks', 'Events', 'Calls'])
        .describe('Module API name of the parent record'),
      recordId: z.string().describe('ID of the record to add the note to'),
      title: z.string().optional().describe('Title of the note'),
      content: z.string().describe('Content body of the note')
    })
  )
  .output(
    z.object({
      noteId: z.string().optional().describe('ID of the created note'),
      status: z.string().describe('Operation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.createNote(ctx.input.module, ctx.input.recordId, {
      title: ctx.input.title,
      content: ctx.input.content
    });

    let item = result.data?.[0];

    return {
      output: {
        noteId: item?.details?.id,
        status: item?.status || 'unknown'
      },
      message: `Created note${ctx.input.title ? ` "${ctx.input.title}"` : ''} on record **${ctx.input.recordId}** in **${ctx.input.module}**.`
    };
  })
  .build();

export let deleteNote = SlateTool.create(spec, {
  name: 'Delete Note',
  key: 'delete_note',
  description: `Permanently delete a note by its ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      noteId: z.string().describe('ID of the note to delete')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Operation status'),
      message: z.string().optional().describe('Status message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.deleteNote(ctx.input.noteId);
    let item = result.data?.[0];

    return {
      output: {
        status: item?.status || 'unknown',
        message: item?.message
      },
      message: `Deleted note **${ctx.input.noteId}**.`
    };
  })
  .build();
