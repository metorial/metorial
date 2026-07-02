import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageSourceFileTool = SlateTool.create(spec, {
  name: 'Manage Source File',
  key: 'manage_source_file',
  description: `Upload a new source file, update an existing one, or delete a file from a Crowdin project. For upload/update, provide the file content as a string. Also supports creating directories and branches.`,
  instructions: [
    'When uploading or updating a file, the content is first uploaded to Crowdin Storage, then linked to the project.',
    'For file-based projects, files are the primary unit of translation.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID'),
      action: z
        .enum(['upload', 'update', 'delete', 'create_directory', 'create_branch'])
        .describe('Action to perform'),
      fileName: z.string().optional().describe('File name (required for upload)'),
      fileContent: z
        .string()
        .optional()
        .describe('File content as a string (required for upload/update)'),
      fileId: z.number().optional().describe('File ID (required for update/delete)'),
      branchId: z.number().optional().describe('Branch ID for the file'),
      directoryId: z.number().optional().describe('Directory ID for the file'),
      title: z.string().optional().describe('Human-readable title'),
      directoryName: z.string().optional().describe('Directory name (for create_directory)'),
      branchName: z.string().optional().describe('Branch name (for create_branch)')
    })
  )
  .output(
    z.object({
      resourceId: z.number().optional().describe('Created/updated resource ID'),
      name: z.string().optional().describe('Resource name'),
      type: z.string().optional().describe('Resource type'),
      deleted: z.boolean().optional().describe('Whether the resource was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, projectId } = ctx.input;

    if (action === 'upload') {
      if (!ctx.input.fileName || !ctx.input.fileContent) {
        throw new Error('fileName and fileContent are required for upload');
      }

      let storage = await client.addStorage(ctx.input.fileName, ctx.input.fileContent);
      let file = await client.createFile(projectId, {
        storageId: storage.id,
        name: ctx.input.fileName,
        branchId: ctx.input.branchId,
        directoryId: ctx.input.directoryId,
        title: ctx.input.title
      });

      return {
        output: {
          resourceId: file.id,
          name: file.name,
          type: 'file'
        },
        message: `Uploaded file **${file.name}** (ID: ${file.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.fileId || !ctx.input.fileContent) {
        throw new Error('fileId and fileContent are required for update');
      }

      let fileName = ctx.input.fileName || `update_${ctx.input.fileId}`;
      let storage = await client.addStorage(fileName, ctx.input.fileContent);
      let file = await client.updateFile(projectId, ctx.input.fileId, {
        storageId: storage.id
      });

      return {
        output: {
          resourceId: file.id,
          name: file.name,
          type: 'file'
        },
        message: `Updated file **${file.name}** (ID: ${file.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.fileId) {
        throw new Error('fileId is required for delete');
      }

      await client.deleteFile(projectId, ctx.input.fileId);

      return {
        output: {
          resourceId: ctx.input.fileId,
          deleted: true,
          type: 'file'
        },
        message: `Deleted file with ID **${ctx.input.fileId}**.`
      };
    }

    if (action === 'create_directory') {
      if (!ctx.input.directoryName) {
        throw new Error('directoryName is required for create_directory');
      }

      let dir = await client.createDirectory(projectId, {
        name: ctx.input.directoryName,
        branchId: ctx.input.branchId,
        directoryId: ctx.input.directoryId,
        title: ctx.input.title
      });

      return {
        output: {
          resourceId: dir.id,
          name: dir.name,
          type: 'directory'
        },
        message: `Created directory **${dir.name}** (ID: ${dir.id}).`
      };
    }

    if (action === 'create_branch') {
      if (!ctx.input.branchName) {
        throw new Error('branchName is required for create_branch');
      }

      let branch = await client.createBranch(projectId, {
        name: ctx.input.branchName,
        title: ctx.input.title
      });

      return {
        output: {
          resourceId: branch.id,
          name: branch.name,
          type: 'branch'
        },
        message: `Created branch **${branch.name}** (ID: ${branch.id}).`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
