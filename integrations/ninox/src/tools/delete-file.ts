import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteFile = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Delete a file attached to a record. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      databaseId: z.string().describe('ID of the database'),
      tableId: z.string().describe('ID of the table (e.g. "A", "B")'),
      recordId: z.number().describe('Numeric ID of the record'),
      fileName: z.string().describe('Name of the file to delete')
    })
  )
  .output(
    z.object({
      deletedFileName: z.string().describe('Name of the deleted file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    await client.deleteFile(
      ctx.input.teamId,
      ctx.input.databaseId,
      ctx.input.tableId,
      ctx.input.recordId,
      ctx.input.fileName
    );

    return {
      output: {
        deletedFileName: ctx.input.fileName
      },
      message: `Deleted file **${ctx.input.fileName}** from record **#${ctx.input.recordId}**.`
    };
  })
  .build();
