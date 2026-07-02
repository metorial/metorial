import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addBookmark = SlateTool.create(spec, {
  name: 'Add Bookmark',
  key: 'add_bookmark',
  description: `Save a new bookmark to Linkhut. Provide a URL and title, with optional notes, tags, visibility, and read-later status. If a bookmark with the same URL already exists, it will be replaced by default unless replacement is disabled.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the page to bookmark'),
      title: z.string().describe('Title or description of the bookmark'),
      notes: z.string().optional().describe('Extended notes about the bookmark'),
      tags: z.string().optional().describe('Comma-delimited list of tags'),
      timestamp: z
        .string()
        .optional()
        .describe('ISO 8601 datetime for the bookmark (e.g. 2024-01-15T10:30:00Z)'),
      replace: z
        .boolean()
        .optional()
        .describe('Whether to replace an existing bookmark at the same URL (default: true)'),
      private: z
        .boolean()
        .optional()
        .describe('Whether the bookmark should be private (default: false)'),
      readLater: z
        .boolean()
        .optional()
        .describe('Whether to mark the bookmark as unread/read-later (default: false)')
    })
  )
  .output(
    z.object({
      resultCode: z.string().describe('Result code from the API (e.g. "done")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.addBookmark({
      url: ctx.input.url,
      description: ctx.input.title,
      extended: ctx.input.notes,
      tags: ctx.input.tags,
      dt: ctx.input.timestamp,
      replace: ctx.input.replace === false ? 'no' : 'yes',
      shared: ctx.input.private === true ? 'no' : 'yes',
      toread: ctx.input.readLater === true ? 'yes' : 'no'
    });

    return {
      output: result,
      message: `Bookmark added for **${ctx.input.url}** with title "${ctx.input.title}". Result: ${result.resultCode}`
    };
  })
  .build();
