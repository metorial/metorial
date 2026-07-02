import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createNoteTool = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Create a new note (feedback item) on the Insights board. Notes capture product ideas, requests, and feedback from any source. You can associate notes with users, companies, tags, and a source URL.`
})
  .input(
    z.object({
      title: z.string().describe('Title of the note'),
      content: z.string().optional().describe('HTML content/body of the note'),
      displayUrl: z
        .string()
        .optional()
        .describe('URL to link to the original source of this feedback'),
      sourceOrigin: z
        .string()
        .optional()
        .describe('Origin system of the note (e.g. "zendesk", "intercom")'),
      sourceRecordId: z.string().optional().describe('Record ID in the origin system'),
      tags: z.array(z.string()).optional().describe('Tags to apply to the note'),
      customerEmail: z
        .string()
        .optional()
        .describe('Email of the customer providing feedback'),
      companyName: z.string().optional().describe('Name of the company providing feedback'),
      userEmail: z.string().optional().describe('Email of the user creating the note')
    })
  )
  .output(
    z.object({
      note: z.record(z.string(), z.any()).describe('The created note')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let source: any;
    if (ctx.input.sourceOrigin) {
      source = { origin: ctx.input.sourceOrigin };
      if (ctx.input.sourceRecordId) source.record_id = ctx.input.sourceRecordId;
    }

    let note = await client.createNote({
      title: ctx.input.title,
      content: ctx.input.content,
      displayUrl: ctx.input.displayUrl,
      source,
      tags: ctx.input.tags,
      customerEmail: ctx.input.customerEmail,
      companyName: ctx.input.companyName,
      user: ctx.input.userEmail ? { email: ctx.input.userEmail } : undefined
    });

    return {
      output: { note },
      message: `Created note **${ctx.input.title}**.`
    };
  })
  .build();
