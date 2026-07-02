import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { createConnectClient } from '../lib/connect-tool';
import { spec } from '../spec';

export let getFileContent = SlateTool.create(spec, {
  name: 'Get File Content',
  key: 'get_file_content',
  description: `Download the content of a file attachment stored on a 1Password item. The file bytes are returned as a Slate attachment, with structured output limited to metadata.`,
  instructions: [
    'Use Get Item or List Files first to find the fileId of the attachment you want to retrieve.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      vaultId: z.string().describe('ID of the vault containing the item'),
      itemId: z.string().describe('ID of the item the file is attached to'),
      fileId: z.string().describe('ID of the file attachment to retrieve')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('ID of the file'),
      byteLength: z.number().describe('Decoded byte length of the returned attachment'),
      mimeType: z.string().describe('MIME type of the returned attachment'),
      attachmentCount: z.number().describe('Number of attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createConnectClient(ctx);

    ctx.progress('Retrieving file content...');
    let file = await client.getFileContent(
      ctx.input.vaultId,
      ctx.input.itemId,
      ctx.input.fileId
    );

    return {
      output: {
        fileId: ctx.input.fileId,
        byteLength: file.byteLength,
        mimeType: file.contentType,
        attachmentCount: 1
      },
      attachments: [createBase64Attachment(file.contentBase64, file.contentType)],
      message: `Retrieved file \`${ctx.input.fileId}\` as an attachment (${file.byteLength} bytes).`
    };
  })
  .build();
