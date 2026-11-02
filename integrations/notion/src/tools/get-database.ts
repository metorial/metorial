import { SlateTool } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let getDatabase = SlateTool.create(spec, {
  name: 'Get Database',
  key: 'get_database',
  description: `Retrieve a Notion database by its ID, including its schema (properties), title, description, and metadata.
Use this to inspect a database's structure before querying or creating entries.
For databases with multiple data sources, the response lists the data sources; pass one as dataSourceId to read its schema.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database to retrieve'),
      dataSourceId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Data source whose schema to return, for databases with multiple data sources'
        )
    })
  )
  .output(
    z.object({
      databaseId: z.string().describe('ID of the database'),
      title: z.string().optional().describe('Plain text title of the database'),
      description: z.string().optional().describe('Plain text description of the database'),
      url: z.string().optional().describe('URL of the database'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Database schema with property names and types'),
      icon: z.any().optional().describe('Database icon'),
      cover: z.any().optional().describe('Database cover image'),
      isInline: z.boolean().optional().describe('Whether the database is displayed inline'),
      archived: z.boolean().optional().describe('Whether the database is archived'),
      inTrash: z.boolean().optional().describe('Whether the database is in trash'),
      createdTime: z.string().optional().describe('When the database was created'),
      lastEditedTime: z.string().optional().describe('When the database was last edited'),
      parent: z.any().optional().describe('Parent reference'),
      dataSourceId: z
        .string()
        .optional()
        .describe('Data source whose schema is returned in properties'),
      dataSources: z
        .array(z.object({ id: z.string(), name: z.string() }))
        .optional()
        .describe(
          'Data sources in this database; returned for multi-source databases or when dataSourceId is given'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new NotionClient({ token: ctx.auth.token });

    let db = await client.getDatabase(ctx.input.databaseId, ctx.input.dataSourceId);

    let title = Array.isArray(db.title)
      ? db.title.map((t: any) => t.plain_text ?? '').join('')
      : undefined;

    let description = Array.isArray(db.description)
      ? db.description.map((t: any) => t.plain_text ?? '').join('')
      : undefined;

    let propertyCount = db.properties ? Object.keys(db.properties).length : 0;

    return {
      output: {
        databaseId: db.id,
        title,
        description,
        url: db.url,
        properties: db.properties,
        icon: db.icon,
        cover: db.cover,
        isInline: db.is_inline,
        archived: db.archived ?? db.in_trash,
        inTrash: db.in_trash,
        createdTime: db.created_time,
        lastEditedTime: db.last_edited_time,
        parent: db.parent,
        dataSourceId: db.dataSourceId,
        dataSources: db.dataSources
      },
      message:
        db.dataSources && !db.properties
          ? `Database${title ? ` **${title}**` : ''} has **${db.dataSources.length}** data sources; pass one as dataSourceId to read its schema${db.url ? ` — [Open in Notion](${db.url})` : ''}`
          : `Retrieved database${title ? ` **${title}**` : ''} with **${propertyCount}** properties${db.url ? ` — [Open in Notion](${db.url})` : ''}`
    };
  })
  .build();
