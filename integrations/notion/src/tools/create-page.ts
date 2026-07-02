import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let createPage = SlateTool.create(spec, {
  name: 'Create Page',
  key: 'create_page',
  description: `Create a new page in Notion as a child of an existing page or as an entry in a database.
Provide a parent (either a page ID or database ID) and properties. For database parents, properties must match the database schema.
Optionally include initial content as block children, and set an icon or cover image.`,
  instructions: [
    'For pages under another page, only the "title" property is supported.',
    'For database entries, properties must match the parent database schema.',
    'Children blocks are limited to 100 per request with up to 2 levels of nesting.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      parentPageId: z
        .string()
        .optional()
        .describe('ID of the parent page (use this OR parentDatabaseId)'),
      parentDatabaseId: z
        .string()
        .optional()
        .describe('ID of the parent database (use this OR parentPageId)'),
      properties: z
        .record(z.string(), z.any())
        .describe(
          'Page properties object. For page parents, use { "title": { "title": [{ "text": { "content": "Page Title" } }] } }'
        ),
      children: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of block objects to add as page content'),
      icon: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Page icon, e.g. { "type": "emoji", "emoji": "..." } or { "type": "external", "external": { "url": "..." } }'
        ),
      cover: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Page cover image, e.g. { "type": "external", "external": { "url": "..." } }'
        )
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('ID of the created page'),
      url: z.string().optional().describe('URL of the created page'),
      createdTime: z.string().optional().describe('Timestamp when the page was created'),
      parentType: z
        .string()
        .optional()
        .describe('Type of parent (page_id, database_id, workspace)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NotionClient({ token: ctx.auth.token });

    let parent: Record<string, any>;
    if (ctx.input.parentDatabaseId) {
      parent = { type: 'database_id', database_id: ctx.input.parentDatabaseId };
    } else if (ctx.input.parentPageId) {
      parent = { type: 'page_id', page_id: ctx.input.parentPageId };
    } else {
      throw createApiServiceError('Either parentPageId or parentDatabaseId must be provided');
    }

    let page = await client.createPage({
      parent,
      properties: ctx.input.properties,
      children: ctx.input.children,
      icon: ctx.input.icon,
      cover: ctx.input.cover
    });

    return {
      output: {
        pageId: page.id,
        url: page.url,
        createdTime: page.created_time,
        parentType: page.parent?.type
      },
      message: `Created page **${page.id}**${page.url ? ` — [Open in Notion](${page.url})` : ''}`
    };
  })
  .build();
