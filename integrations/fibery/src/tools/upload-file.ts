import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadFileTool = SlateTool.create(spec, {
  name: 'Upload File from URL',
  key: 'upload_file',
  description: `Upload a file to the Fibery workspace from a public URL. Returns the file entity which can then be attached to entities using the "manage_collection" tool.`,
  instructions: [
    'After uploading, use "manage_collection" with action "add" to attach the file to an entity.',
    'The file\'s collection field is typically named "TypeName/Files".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      fileUrl: z.string().describe('Public URL of the file to upload'),
      fileName: z.string().optional().describe('Optional name for the uploaded file')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('The fibery/id of the uploaded file entity'),
      fileSecret: z.string().describe('The fibery/secret for downloading the file'),
      fileName: z.string().describe('Name of the uploaded file'),
      contentType: z.string().describe('MIME type of the uploaded file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.accountName,
      token: ctx.auth.token
    });

    let result = await client.uploadFileFromUrl({
      url: ctx.input.fileUrl,
      name: ctx.input.fileName
    });

    return {
      output: {
        fileId: result['fibery/id'] || '',
        fileSecret: result['fibery/secret'] || '',
        fileName: result['fibery/name'] || ctx.input.fileName || '',
        contentType: result['fibery/content-type'] || ''
      },
      message: `Uploaded file **${result['fibery/name'] || ctx.input.fileName || 'file'}** (${result['fibery/content-type'] || 'unknown type'}).`
    };
  })
  .build();
