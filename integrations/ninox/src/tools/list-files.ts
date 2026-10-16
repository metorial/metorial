import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `List all files attached to a specific record. Returns file metadata including name, content type, size, and modification info.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('Team ID. Use list_teams to discover accessible teams.'),
      databaseId: z
        .string()
        .describe('Database ID. Use list_databases to discover databases.'),
      tableId: z
        .string()
        .describe('Table ID (e.g. "A", "B"). Use get_table_schema to discover tables.'),
      recordId: z.number().describe('Numeric ID of the record')
    })
  )
  .output(
    z.object({
      files: z
        .array(
          z.object({
            fileName: z.string().describe('Name of the file'),
            contentType: z.string().describe('MIME type of the file'),
            size: z.number().describe('File size in bytes'),
            modifiedDate: z.string().optional().describe('Last modification date of the file'),
            modifiedUser: z.string().optional().describe('User who last modified the file')
          })
        )
        .describe('List of attached files'),
      count: z.number().describe('Number of files attached')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let files = await client.listFiles(
      ctx.input.teamId,
      ctx.input.databaseId,
      ctx.input.tableId,
      ctx.input.recordId
    );

    return {
      output: {
        files: files.map(f => ({
          fileName: f.name,
          contentType: f.contentType,
          size: f.size,
          modifiedDate: f.modifiedDate === undefined ? undefined : String(f.modifiedDate),
          modifiedUser: f.modifiedUser
        })),
        count: files.length
      },
      message: `Found **${files.length}** file(s) attached to record **#${ctx.input.recordId}**.`
    };
  })
  .build();
