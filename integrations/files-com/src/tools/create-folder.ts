import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { text } from '../lib/contracts';
import { spec } from '../spec';

export let createFolder = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description: `Create a new folder at the specified path. Automatically creates parent directories if they don't exist.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      path: z
        .string()
        .describe('Full path for the new folder (e.g. "documents/reports/2024")'),
      mkdirParents: z
        .boolean()
        .optional()
        .default(true)
        .describe('Create parent directories automatically (default true)')
    })
  )
  .output(
    z.object({
      path: z.string().describe('Full path of the created folder'),
      displayName: z.string().describe('Display name of the folder'),
      type: z.string().describe('Always "directory"')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let result = await client.createFolder(ctx.input.path, {
      mkdirParents: ctx.input.mkdirParents
    });

    return {
      output: {
        path: text(result.path),
        displayName: text(result.display_name),
        type: 'directory'
      },
      message: `Created folder \`${result.path}\``
    };
  })
  .build();
