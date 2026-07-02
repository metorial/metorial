import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/client';
import { spec } from '../spec';

export let getFileContent = SlateTool.create(spec, {
  name: 'Get File Content',
  key: 'get_file_content',
  description: `Retrieve the content of a file attachment stored on a 1Password item. Use the Get Item tool first to discover file IDs and names attached to an item. Returns the file content as text.`,
  instructions: [
    'Use Get Item first to find the fileId of the attachment you want to retrieve.'
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
      content: z.string().describe('Content of the file as text')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.config.connectServerUrl) {
      throw new Error('Connect server URL is required. Set it in the configuration.');
    }

    let client = new ConnectClient({
      token: ctx.auth.token,
      serverUrl: ctx.config.connectServerUrl
    });

    ctx.progress('Retrieving file content...');
    let content = await client.getFileContent(
      ctx.input.vaultId,
      ctx.input.itemId,
      ctx.input.fileId
    );

    return {
      output: {
        fileId: ctx.input.fileId,
        content
      },
      message: `Retrieved content for file \`${ctx.input.fileId}\` (${content.length} characters).`
    };
  })
  .build();
