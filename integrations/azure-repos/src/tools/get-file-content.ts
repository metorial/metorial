import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFileContent = SlateTool.create(spec, {
  name: 'Get File Content',
  key: 'get_file_content',
  description: `Retrieves the content of a file from a repository at a specific version (branch, tag, or commit). Can also list files/folders at a given path.`,
  instructions: [
    'For listing directory contents, set the path to a folder and isFolder to true.',
    'When specifying a version, use versionType to indicate whether it is a "branch", "tag", or "commit".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repositoryId: z.string().describe('ID or name of the repository'),
      path: z.string().describe('File or folder path (e.g., "/src/app.ts" or "/src")'),
      version: z
        .string()
        .optional()
        .describe('Version identifier (branch name, tag name, or commit SHA)'),
      versionType: z
        .enum(['branch', 'tag', 'commit'])
        .optional()
        .describe('Type of version identifier'),
      isFolder: z
        .boolean()
        .optional()
        .describe('Set to true to list folder contents instead of retrieving file content'),
      recursionLevel: z
        .enum(['none', 'oneLevel', 'full'])
        .optional()
        .describe('Recursion level for folder listing (default: "oneLevel")')
    })
  )
  .output(
    z.object({
      path: z.string().describe('Path of the file or folder'),
      isFolder: z.boolean().describe('Whether this is a folder'),
      objectId: z.string().optional().describe('Git object ID'),
      commitId: z.string().optional().describe('Commit SHA for this version'),
      content: z.string().optional().describe('File content (for files only)'),
      items: z
        .array(
          z.object({
            path: z.string().describe('Path of the item'),
            isFolder: z.boolean().optional().describe('Whether this item is a folder'),
            objectId: z.string().describe('Git object ID')
          })
        )
        .optional()
        .describe('List of items in the folder (for folders only)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organization: ctx.config.organization,
      project: ctx.config.project
    });

    if (ctx.input.isFolder) {
      let items = await client.getItems(ctx.input.repositoryId, ctx.input.path, {
        version: ctx.input.version,
        versionType: ctx.input.versionType,
        recursionLevel: ctx.input.recursionLevel ?? 'oneLevel'
      });

      return {
        output: {
          path: ctx.input.path,
          isFolder: true,
          items: items.map(item => ({
            path: item.path,
            isFolder: item.isFolder,
            objectId: item.objectId
          }))
        },
        message: `Listed **${items.length}** items at path **${ctx.input.path}**.`
      };
    } else {
      let item = await client.getItem(ctx.input.repositoryId, ctx.input.path, {
        version: ctx.input.version,
        versionType: ctx.input.versionType,
        includeContent: true
      });

      return {
        output: {
          path: item.path,
          isFolder: false,
          objectId: item.objectId,
          commitId: item.commitId,
          content: item.content
        },
        message: `Retrieved file **${ctx.input.path}**.`
      };
    }
  })
  .build();
