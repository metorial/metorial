import { SlateTool } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let updateDatabase = SlateTool.create(spec, {
  name: 'Update Database',
  key: 'update_database',
  description: `Update a Notion database's title, description, schema (properties), icon, or cover.
Use this to add, rename, or remove properties from a database schema, or to change database metadata.`,
  instructions: [
    'To add a property, include it in the properties object with its type config.',
    'To rename a property, include it with its existing key and set a "name" field.',
    'To remove a property, set it to null in the properties object.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database to update'),
      title: z.string().optional().describe('New title for the database'),
      description: z.string().optional().describe('New description for the database'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Properties to add, update, or remove (set to null)'),
      icon: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('New icon, or null to remove'),
      cover: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('New cover, or null to remove'),
      isInline: z.boolean().optional().describe('Whether the database should be inline'),
      archived: z.boolean().optional().describe('Whether to archive or unarchive the database')
    })
  )
  .output(
    z.object({
      databaseId: z.string().describe('ID of the updated database'),
      url: z.string().optional().describe('URL of the database'),
      lastEditedTime: z.string().optional().describe('When the database was last edited')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NotionClient({ token: ctx.auth.token });

    let titleRichText = ctx.input.title
      ? [{ type: 'text', text: { content: ctx.input.title } }]
      : undefined;

    let descriptionRichText =
      ctx.input.description !== undefined
        ? [{ type: 'text', text: { content: ctx.input.description } }]
        : undefined;

    let db = await client.updateDatabase(ctx.input.databaseId, {
      title: titleRichText,
      description: descriptionRichText,
      properties: ctx.input.properties,
      icon: ctx.input.icon,
      cover: ctx.input.cover,
      isInline: ctx.input.isInline,
      archived: ctx.input.archived
    });

    return {
      output: {
        databaseId: db.id,
        url: db.url,
        lastEditedTime: db.last_edited_time
      },
      message: `Updated database **${db.id}**${db.url ? ` — [Open in Notion](${db.url})` : ''}`
    };
  })
  .build();
