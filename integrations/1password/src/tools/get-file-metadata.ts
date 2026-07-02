import { SlateTool } from 'slates';
import { z } from 'zod';
import { createConnectClient } from '../lib/connect-tool';
import { spec } from '../spec';

export let getFileMetadata = SlateTool.create(spec, {
  name: 'Get File Metadata',
  key: 'get_file_metadata',
  description: `Retrieve metadata for a specific file attachment on a 1Password item without downloading the file content.`,
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
      fileId: z.string().describe('Unique identifier of the file'),
      name: z.string().describe('Filename'),
      size: z.number().describe('File size in bytes'),
      contentPath: z.string().optional().describe('API path to retrieve file content'),
      sectionId: z.string().optional().describe('ID of the section containing the file'),
      sectionLabel: z.string().optional().describe('Label of the section containing the file')
    })
  )
  .handleInvocation(async ctx => {
    let client = createConnectClient(ctx);

    ctx.progress('Fetching file metadata...');
    let file = await client.getFile(ctx.input.vaultId, ctx.input.itemId, ctx.input.fileId);

    return {
      output: {
        fileId: file.id,
        name: file.name,
        size: file.size,
        contentPath: file.contentPath ?? file.content_path,
        sectionId: file.section?.id,
        sectionLabel: file.section?.label
      },
      message: `Retrieved metadata for file **${file.name}** (${file.size} bytes).`
    };
  })
  .build();
