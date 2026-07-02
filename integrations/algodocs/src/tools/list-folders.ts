import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFolders = SlateTool.create(spec, {
  name: 'List Folders',
  key: 'list_folders',
  description: `Lists all folders in your Algodocs account. Folders have a hierarchical structure and are required when uploading documents. Use this to discover available folders and obtain their IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      folders: z
        .array(
          z.object({
            folderId: z.string().describe('Unique identifier of the folder'),
            parentFolderId: z
              .string()
              .nullable()
              .describe('ID of the parent folder, or null if top-level'),
            name: z.string().describe('Name of the folder')
          })
        )
        .describe('List of folders in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    let folders = await client.getFolders();

    let mapped = folders.map(f => ({
      folderId: f.id,
      parentFolderId: f.parentId,
      name: f.name
    }));

    return {
      output: { folders: mapped },
      message: `Found **${mapped.length}** folder(s).\n\n${mapped.map(f => `- **${f.name}** (\`${f.folderId}\`)`).join('\n')}`
    };
  })
  .build();
