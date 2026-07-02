import { SlateTool } from 'slates';
import { z } from 'zod';
import { NanonetsClient } from '../lib/client';
import { spec } from '../spec';

export let deleteFiles = SlateTool.create(spec, {
  name: 'Delete Files',
  key: 'delete_files',
  description:
    'Delete processed files from a Nanonets model. Use this to remove test uploads or files that should no longer be retained.',
  instructions: ['Use request file IDs returned by extraction or prediction result tools.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      modelId: z.string().describe('ID of the model the files belong to'),
      fileIds: z.array(z.string()).min(1).describe('Request file IDs to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether all delete requests completed'),
      modelId: z.string().describe('ID of the model the files belonged to'),
      deletedCount: z.number().describe('Number of files deleted'),
      fileIds: z.array(z.string()).describe('Request file IDs that were deleted'),
      responses: z.array(z.any()).optional().describe('Raw Nanonets delete responses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NanonetsClient(ctx.auth.token);
    let responses: any[] = [];

    for (let fileId of ctx.input.fileIds) {
      responses.push(await client.deleteFile(ctx.input.modelId, fileId));
    }

    return {
      output: {
        success: true,
        modelId: ctx.input.modelId,
        deletedCount: ctx.input.fileIds.length,
        fileIds: ctx.input.fileIds,
        responses
      },
      message: `Deleted **${ctx.input.fileIds.length}** file(s) from model \`${ctx.input.modelId}\`.`
    };
  })
  .build();
