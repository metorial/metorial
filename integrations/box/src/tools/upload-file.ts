import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description: `Upload a new file to a Box folder. Provide the file name, target folder, and text content. Best suited for text-based files.`,
  constraints: [
    'Only supports text-based file content. Binary files should be uploaded through the Box UI.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      parentFolderId: z
        .string()
        .describe('The ID of the folder to upload into (use "0" for root folder)'),
      fileName: z.string().describe('Name for the uploaded file including extension'),
      content: z.string().describe('Text content of the file')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('The unique ID of the uploaded file'),
      name: z.string().describe('Name of the uploaded file'),
      size: z.number().optional().describe('File size in bytes'),
      parentFolderId: z.string().optional().describe('ID of the parent folder'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let file = await client.uploadFile(
      ctx.input.parentFolderId,
      ctx.input.fileName,
      ctx.input.content
    );

    return {
      output: {
        fileId: file.id,
        name: file.name,
        size: file.size,
        parentFolderId: file.parent?.id,
        createdAt: file.created_at
      },
      message: `Uploaded file **${file.name}** (${file.id}) to folder ${ctx.input.parentFolderId}.`
    };
  });
