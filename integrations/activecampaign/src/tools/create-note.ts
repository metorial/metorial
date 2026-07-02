import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createNote = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Creates a note on a contact, deal, or account. Specify the resource type and ID along with the note content.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['contact', 'deal', 'account'])
        .describe('Type of resource to add the note to'),
      resourceId: z.string().describe('ID of the contact, deal, or account'),
      note: z.string().describe('Content of the note')
    })
  )
  .output(
    z.object({
      noteId: z.string().optional().describe('ID of the created note'),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let result: any;
    switch (ctx.input.resourceType) {
      case 'contact':
        result = await client.createContactNote(ctx.input.resourceId, ctx.input.note);
        break;
      case 'deal':
        result = await client.createDealNote(ctx.input.resourceId, ctx.input.note);
        break;
      case 'account':
        result = await client.createAccountNote(ctx.input.resourceId, ctx.input.note);
        break;
    }

    return {
      output: {
        noteId: result?.note?.id || undefined,
        success: true
      },
      message: `Note added to ${ctx.input.resourceType} (ID: ${ctx.input.resourceId}).`
    };
  })
  .build();
