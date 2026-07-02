import { SlateTool } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let createDatabase = SlateTool.create(spec, {
  name: 'Create Database',
  key: 'create_database',
  description: `Create a new database in Notion as a child of an existing page.
Define the database schema by specifying property names and types. Supported property types include title, rich_text, number, select, multi_select, date, people, files, checkbox, url, email, phone_number, formula, relation, rollup, status, and more.`,
  instructions: [
    'Every database must include exactly one "title" property.',
    'Properties follow Notion format, e.g. { "Name": { "title": {} }, "Tags": { "multi_select": { "options": [{ "name": "Tag1" }] } } }'
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
        .describe('ID of the parent page where the database will be created'),
      title: z.string().describe('Title of the database'),
      properties: z
        .record(z.string(), z.any())
        .describe('Database schema defining property names and their types'),
      description: z.string().optional().describe('Description of the database'),
      isInline: z
        .boolean()
        .optional()
        .describe('Whether the database should be displayed inline'),
      icon: z.record(z.string(), z.any()).optional().describe('Database icon'),
      cover: z.record(z.string(), z.any()).optional().describe('Database cover image')
    })
  )
  .output(
    z.object({
      databaseId: z.string().describe('ID of the created database'),
      url: z.string().optional().describe('URL of the database'),
      createdTime: z.string().optional().describe('When the database was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NotionClient({ token: ctx.auth.token });

    let titleRichText = [{ type: 'text', text: { content: ctx.input.title } }];

    let descriptionRichText = ctx.input.description
      ? [{ type: 'text', text: { content: ctx.input.description } }]
      : undefined;

    let db = await client.createDatabase({
      parent: { type: 'page_id', page_id: ctx.input.parentPageId },
      title: titleRichText,
      properties: ctx.input.properties,
      description: descriptionRichText,
      isInline: ctx.input.isInline,
      icon: ctx.input.icon,
      cover: ctx.input.cover
    });

    return {
      output: {
        databaseId: db.id,
        url: db.url,
        createdTime: db.created_time
      },
      message: `Created database **${ctx.input.title}** (${db.id})${db.url ? ` — [Open in Notion](${db.url})` : ''}`
    };
  })
  .build();
