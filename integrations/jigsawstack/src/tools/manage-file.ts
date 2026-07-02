import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFile = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Retrieve a previously uploaded file from JigsawStack's file storage. Returns the file's accessible URL. Files can be referenced by their key in other API calls (e.g., vOCR, speech-to-text).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileKey: z.string().describe('Storage key of the file to retrieve')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      fileUrl: z.string().optional().describe('Accessible URL of the file'),
      fileKey: z.string().optional().describe('The file key')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getFile({ key: ctx.input.fileKey });

    return {
      output: {
        success: result.success,
        fileUrl: result.url,
        fileKey: result.key
      },
      message: `Retrieved file **${ctx.input.fileKey}**. URL: ${result.url}`
    };
  })
  .build();

export let deleteFile = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Delete a file from JigsawStack's file storage by its key.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      fileKey: z.string().describe('Storage key of the file to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteFile({ key: ctx.input.fileKey });

    return {
      output: {
        success: result.success
      },
      message: `Deleted file **${ctx.input.fileKey}**.`
    };
  })
  .build();
