import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDocTool = SlateTool.create(spec, {
  name: 'Create Doc',
  key: 'create_doc',
  description: `Create a new Coda doc, optionally from an existing doc as a template. The doc can be placed in a specific folder and timezone.`,
  constraints: [
    'The API token owner must have the Doc Maker or Admin role in the target workspace.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().optional().describe('Title for the new doc'),
      sourceDocId: z
        .string()
        .optional()
        .describe('ID of an existing doc to copy as a template'),
      folderId: z.string().optional().describe('ID of the folder to create the doc in'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for the doc (e.g. "America/New_York")')
    })
  )
  .output(
    z.object({
      docId: z.string().describe('ID of the newly created doc'),
      name: z.string().describe('Title of the created doc'),
      browserLink: z.string().optional().describe('URL to open the doc')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let doc = await client.createDoc({
      title: ctx.input.title,
      sourceDoc: ctx.input.sourceDocId,
      folderId: ctx.input.folderId,
      timezone: ctx.input.timezone
    });

    return {
      output: {
        docId: doc.id,
        name: doc.name,
        browserLink: doc.browserLink
      },
      message: `Created doc **${doc.name}** (${doc.id}).`
    };
  })
  .build();
