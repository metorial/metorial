import { SlateTool } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let manageFolder = SlateTool.create(spec, {
  name: 'Manage Folder',
  key: 'manage_folder',
  description: `Create or delete Jenkins folders for organizing jobs. Folders can be nested inside other folders.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete']).describe('Action to perform'),
      folderName: z.string().describe('Name of the folder'),
      parentPath: z
        .string()
        .optional()
        .describe(
          'Parent folder path for nested folders (e.g. "parent-folder" or "grandparent/parent")'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      action: z.string().describe('The action that was performed'),
      folderName: z.string().describe('Name of the folder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JenkinsClient({
      instanceUrl: ctx.config.instanceUrl,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'create') {
      await client.createFolder(ctx.input.folderName, ctx.input.parentPath);
    } else {
      let path = ctx.input.parentPath
        ? `${ctx.input.parentPath}/${ctx.input.folderName}`
        : ctx.input.folderName;
      await client.deleteJob(path);
    }

    return {
      output: {
        success: true,
        action: ctx.input.action,
        folderName: ctx.input.folderName
      },
      message: `Folder \`${ctx.input.folderName}\` ${ctx.input.action === 'create' ? 'created' : 'deleted'}${ctx.input.parentPath ? ` in \`${ctx.input.parentPath}\`` : ''}.`
    };
  })
  .build();
