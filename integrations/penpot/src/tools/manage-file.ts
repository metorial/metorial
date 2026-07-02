import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageFileTool = SlateTool.create(spec, {
  name: 'Manage File',
  key: 'manage_file',
  description: `Create, rename, delete, or update sharing settings of a design file. Use **action** to specify the operation.`
})
  .input(
    z.object({
      action: z
        .enum(['create', 'rename', 'delete', 'set_shared'])
        .describe('The operation to perform'),
      projectId: z.string().optional().describe('Project ID (required for "create")'),
      fileId: z
        .string()
        .optional()
        .describe('File ID (required for "rename", "delete", "set_shared")'),
      name: z.string().optional().describe('File name (required for "create" and "rename")'),
      isShared: z
        .boolean()
        .optional()
        .describe('Whether the file is a shared library (for "create" and "set_shared")')
    })
  )
  .output(
    z.object({
      fileId: z.string().optional().describe('ID of the file'),
      name: z.string().optional().describe('Name of the file'),
      projectId: z.string().optional().describe('Project ID the file belongs to'),
      isShared: z.boolean().optional().describe('Whether the file is shared')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let { action, projectId, fileId, name, isShared } = ctx.input;

    switch (action) {
      case 'create': {
        if (!projectId || !name)
          throw new Error('projectId and name are required for create action');
        let file = await client.createFile(projectId, name, isShared);
        return {
          output: {
            fileId: file.id,
            name: file.name,
            projectId: file['project-id'] ?? file.projectId,
            isShared: file['is-shared'] ?? file.isShared
          },
          message: `Created file **${name}**.`
        };
      }
      case 'rename': {
        if (!fileId || !name)
          throw new Error('fileId and name are required for rename action');
        let file = await client.renameFile(fileId, name);
        return {
          output: { fileId: file.id, name: file.name },
          message: `Renamed file to **${name}**.`
        };
      }
      case 'delete': {
        if (!fileId) throw new Error('fileId is required for delete action');
        await client.deleteFile(fileId);
        return {
          output: { fileId },
          message: `Deleted file \`${fileId}\`.`
        };
      }
      case 'set_shared': {
        if (!fileId || isShared === undefined)
          throw new Error('fileId and isShared are required for set_shared action');
        let result = await client.setFileShared(fileId, isShared);
        return {
          output: {
            fileId: result.id,
            name: result.name,
            isShared: result['is-shared'] ?? result.isShared
          },
          message: `Set file sharing to **${isShared}**.`
        };
      }
    }
  })
  .build();
