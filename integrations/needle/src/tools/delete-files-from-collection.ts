import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeedleClient } from '../lib/client';
import { spec } from '../spec';

export let deleteFilesFromCollection = SlateTool.create(spec, {
  name: 'Delete Files from Collection',
  key: 'delete_files_from_collection',
  description: `Remove one or more files from a collection by their file IDs. Files managed by connectors (e.g. Google Drive sync) cannot be manually deleted.`,
  constraints: [
    'Between 1 and 100 file IDs per request.',
    'Connector-managed files cannot be deleted through this tool.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      collectionId: z.string().describe('ID of the collection to remove files from'),
      fileIds: z.array(z.string()).min(1).max(100).describe('IDs of the files to remove')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the files were successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeedleClient(ctx.auth.token);
    await client.deleteFilesFromCollection(ctx.input.collectionId, ctx.input.fileIds);

    return {
      output: { deleted: true },
      message: `Deleted **${ctx.input.fileIds.length}** file(s) from collection \`${ctx.input.collectionId}\`.`
    };
  })
  .build();
