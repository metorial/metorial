import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let downloadFile = SlateTool.create(spec, {
  name: 'Download File',
  key: 'download_file',
  description:
    'Prepare a file on a Ninox record for download. Use list_files to discover filenames.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      teamId: z.string().describe('Team ID. Use list_teams to discover accessible teams.'),
      databaseId: z
        .string()
        .describe('Database ID. Use list_databases to discover databases.'),
      tableId: z.string().describe('Table ID. Use get_table_schema to discover tables.'),
      recordId: z.number().describe('Numeric ID of the record'),
      fileName: z.string().describe('File name returned by list_files')
    })
  )
  .output(
    z.object({
      fileName: z.string().describe('File name returned by Ninox'),
      contentType: z.string().describe('File MIME type'),
      size: z.number().describe('File size in bytes')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { teamId, databaseId, tableId, recordId, fileName } = ctx.input;
    let file = await client.getFileMetadata(teamId, databaseId, tableId, recordId, fileName);

    await ctx.addAttachment({
      type: 'url',
      url: client.getFileDownloadUrl(teamId, databaseId, tableId, recordId, fileName),
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      filename: file.name,
      mimeType: file.contentType
    });

    return {
      output: { fileName: file.name, contentType: file.contentType, size: file.size },
      message: `Prepared **${file.name}** for download.`
    };
  })
  .build();
