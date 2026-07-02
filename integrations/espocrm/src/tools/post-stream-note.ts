import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let postStreamNote = SlateTool.create(spec, {
  name: 'Post Stream Note',
  key: 'post_stream_note',
  description: `Post a note to the activity stream of any record in EspoCRM. Stream notes serve as comments or updates visible on the record's detail view.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      entityType: z
        .string()
        .describe(
          'Entity type of the record (e.g., Contact, Account, Lead, Opportunity, Case)'
        ),
      recordId: z.string().describe('ID of the record to post the note to'),
      post: z.string().describe('Note text content')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('ID of the created note'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.postNote(
      ctx.input.entityType,
      ctx.input.recordId,
      ctx.input.post
    );

    return {
      output: {
        noteId: result.id,
        createdAt: result.createdAt
      },
      message: `Note posted to ${ctx.input.entityType} **${ctx.input.recordId}**.`
    };
  })
  .build();
