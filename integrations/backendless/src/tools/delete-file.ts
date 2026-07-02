import { SlateTool } from 'slates';
import { z } from 'zod';
import { BackendlessClient } from '../lib/client';
import { spec } from '../spec';

export let deleteFile = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Deletes a file or directory from Backendless file storage. Provide the full path including the file name.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      filePath: z
        .string()
        .describe(
          'Full path to the file or directory to delete, e.g. "/images/logo.png" or "/temp"'
        )
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BackendlessClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      region: ctx.config.region
    });

    await client.deleteFile(ctx.input.filePath);

    return {
      output: {
        deleted: true
      },
      message: `Deleted **${ctx.input.filePath}** from file storage.`
    };
  })
  .build();
