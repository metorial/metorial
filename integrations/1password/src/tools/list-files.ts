import { SlateTool } from 'slates';
import { z } from 'zod';
import { createConnectClient } from '../lib/connect-tool';
import { spec } from '../spec';

let fileOutputSchema = z.object({
  fileId: z.string().describe('Unique identifier of the file'),
  name: z.string().describe('Filename'),
  size: z.number().describe('File size in bytes'),
  contentPath: z.string().optional().describe('API path to retrieve file content'),
  sectionId: z.string().optional().describe('ID of the section containing the file'),
  sectionLabel: z.string().optional().describe('Label of the section containing the file')
});

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `List file attachments on a 1Password item. Returns file metadata only; use Get File Content to download bytes as a Slate attachment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      vaultId: z.string().describe('ID of the vault containing the item'),
      itemId: z.string().describe('ID of the item whose files should be listed')
    })
  )
  .output(
    z.object({
      files: z.array(fileOutputSchema).describe('File attachments on the item')
    })
  )
  .handleInvocation(async ctx => {
    let client = createConnectClient(ctx);

    ctx.progress('Listing files...');
    let files = await client.listFiles(ctx.input.vaultId, ctx.input.itemId);
    let mapped = files.map(file => ({
      fileId: file.id,
      name: file.name,
      size: file.size,
      contentPath: file.contentPath ?? file.content_path,
      sectionId: file.section?.id,
      sectionLabel: file.section?.label
    }));

    return {
      output: { files: mapped },
      message: `Found **${mapped.length}** file attachment(s).`
    };
  })
  .build();
