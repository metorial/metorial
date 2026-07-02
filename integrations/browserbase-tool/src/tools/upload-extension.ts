import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadExtension = SlateTool.create(spec, {
  name: 'Upload Extension',
  key: 'upload_extension',
  description: `Upload a Chrome extension ZIP to Browserbase so it can be loaded into future browser sessions via extensionId.`,
  instructions: [
    'Provide a ZIP file with manifest.json at the archive root.',
    'Use the returned extensionId in create_session.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileName: z.string().describe('Extension ZIP filename, for example extension.zip'),
      fileContentBase64: z.string().describe('Base64-encoded extension ZIP file bytes'),
      mimeType: z
        .string()
        .optional()
        .describe('Extension MIME type. Defaults to application/zip.')
    })
  )
  .output(
    z.object({
      extensionId: z.string().describe('Extension identifier'),
      fileName: z.string().describe('Uploaded file name'),
      projectId: z.string().describe('Linked project ID'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let extension = await client.uploadExtension({
      fileName: ctx.input.fileName,
      contentBase64: ctx.input.fileContentBase64,
      mimeType: ctx.input.mimeType
    });

    return {
      output: {
        extensionId: extension.extensionId,
        fileName: extension.fileName,
        projectId: extension.projectId,
        createdAt: extension.createdAt,
        updatedAt: extension.updatedAt
      },
      message: `Uploaded extension **${extension.extensionId}** (${extension.fileName}).`
    };
  })
  .build();
