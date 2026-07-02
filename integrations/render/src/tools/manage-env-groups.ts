import { createApiServiceError, createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let manageEnvGroups = SlateTool.create(spec, {
  name: 'Manage Environment Groups',
  key: 'manage_env_groups',
  description: `Manage Render environment groups — shared sets of environment variables that can be linked to multiple services. Supports **list**, **get**, **create**, **update**, **delete**, **link_service**, **unlink_service**, **set_var**, and **delete_var** actions.`
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'create',
          'update',
          'delete',
          'link_service',
          'unlink_service',
          'set_var',
          'delete_var',
          'get_secret_file',
          'set_secret_file',
          'delete_secret_file'
        ])
        .describe('Action to perform'),
      envGroupId: z
        .string()
        .optional()
        .describe('Environment group ID (required for most actions)'),
      ownerId: z.string().optional().describe('Workspace ID (for list/create)'),
      name: z.string().optional().describe('Group name (for create/update)'),
      serviceId: z.string().optional().describe('Service ID (for link/unlink)'),
      varName: z.string().optional().describe('Variable name (for set_var/delete_var)'),
      varValue: z.string().optional().describe('Variable value (for set_var)'),
      secretFileName: z
        .string()
        .optional()
        .describe('Secret file name (for get_secret_file/set_secret_file/delete_secret_file)'),
      secretFileContent: z
        .string()
        .optional()
        .describe('Secret file content (required for set_secret_file)'),
      limit: z.number().optional().describe('Max results for list'),
      cursor: z.string().optional().describe('Pagination cursor for list')
    })
  )
  .output(
    z.object({
      envGroups: z
        .array(
          z.object({
            envGroupId: z.string().describe('Environment group ID'),
            name: z.string().describe('Group name'),
            ownerId: z.string().optional().describe('Workspace/owner ID'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of environment groups'),
      envGroup: z
        .object({
          envGroupId: z.string().describe('Environment group ID'),
          name: z.string().optional().describe('Group name'),
          ownerId: z.string().optional().describe('Workspace/owner ID')
        })
        .optional()
        .describe('Single environment group details'),
      secretFile: z
        .object({
          name: z.string().describe('Secret file name')
        })
        .optional()
        .describe('Secret file metadata'),
      attachmentCount: z.number().optional().describe('Number of Slate attachments returned'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let { action, envGroupId } = ctx.input;

    if (action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.ownerId) params.ownerId = [ctx.input.ownerId];
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.cursor) params.cursor = ctx.input.cursor;
      let data = await client.listEnvGroups(params);
      let envGroups = (data as any[]).map((item: any) => {
        let eg = item.envGroup || item;
        return {
          envGroupId: eg.id,
          name: eg.name,
          ownerId: eg.ownerId,
          createdAt: eg.createdAt
        };
      });
      return {
        output: { envGroups, success: true },
        message: `Found **${envGroups.length}** environment group(s).${envGroups.map(g => `\n- **${g.name}** (\`${g.envGroupId}\`)`).join('')}`
      };
    }

    if (action === 'create') {
      if (!ctx.input.ownerId) throw createApiServiceError('ownerId is required for create');
      if (!ctx.input.name) throw createApiServiceError('name is required for create');
      let body: Record<string, any> = { ownerId: ctx.input.ownerId, name: ctx.input.name };
      let eg = await client.createEnvGroup(body);
      return {
        output: {
          envGroup: { envGroupId: eg.id, name: eg.name, ownerId: eg.ownerId },
          success: true
        },
        message: `Created environment group **${eg.name}** (\`${eg.id}\`).`
      };
    }

    if (!envGroupId) throw createApiServiceError('envGroupId is required');

    if (action === 'get') {
      let eg = await client.getEnvGroup(envGroupId);
      return {
        output: {
          envGroup: { envGroupId: eg.id, name: eg.name, ownerId: eg.ownerId },
          success: true
        },
        message: `Environment group **${eg.name}** (\`${eg.id}\`).`
      };
    }

    if (action === 'update') {
      let body: Record<string, any> = {};
      if (ctx.input.name) body.name = ctx.input.name;
      let eg = await client.updateEnvGroup(envGroupId, body);
      return {
        output: { envGroup: { envGroupId: eg.id, name: eg.name }, success: true },
        message: `Updated environment group **${eg.name}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteEnvGroup(envGroupId);
      return {
        output: { success: true },
        message: `Deleted environment group \`${envGroupId}\`.`
      };
    }

    if (action === 'link_service') {
      if (!ctx.input.serviceId)
        throw createApiServiceError('serviceId is required for link_service');
      await client.linkServiceToEnvGroup(envGroupId, ctx.input.serviceId);
      return {
        output: { success: true },
        message: `Linked service \`${ctx.input.serviceId}\` to environment group \`${envGroupId}\`.`
      };
    }

    if (action === 'unlink_service') {
      if (!ctx.input.serviceId)
        throw createApiServiceError('serviceId is required for unlink_service');
      await client.unlinkServiceFromEnvGroup(envGroupId, ctx.input.serviceId);
      return {
        output: { success: true },
        message: `Unlinked service \`${ctx.input.serviceId}\` from environment group \`${envGroupId}\`.`
      };
    }

    if (action === 'set_var') {
      if (!ctx.input.varName) throw createApiServiceError('varName is required for set_var');
      if (ctx.input.varValue === undefined)
        throw createApiServiceError('varValue is required for set_var');
      await client.setEnvGroupVar(envGroupId, ctx.input.varName, ctx.input.varValue);
      return {
        output: { success: true },
        message: `Set variable \`${ctx.input.varName}\` on environment group \`${envGroupId}\`.`
      };
    }

    if (action === 'delete_var') {
      if (!ctx.input.varName)
        throw createApiServiceError('varName is required for delete_var');
      await client.deleteEnvGroupVar(envGroupId, ctx.input.varName);
      return {
        output: { success: true },
        message: `Deleted variable \`${ctx.input.varName}\` from environment group \`${envGroupId}\`.`
      };
    }

    if (action === 'get_secret_file') {
      if (!ctx.input.secretFileName)
        throw createApiServiceError('secretFileName is required for get_secret_file');
      let secretFile = await client.getEnvGroupSecretFile(
        envGroupId,
        ctx.input.secretFileName
      );
      return {
        output: {
          secretFile: { name: secretFile.name ?? ctx.input.secretFileName },
          attachmentCount: 1,
          success: true
        },
        attachments: [createTextAttachment(secretFile.content ?? '', 'text/plain')],
        message: `Retrieved secret file \`${ctx.input.secretFileName}\` from environment group \`${envGroupId}\`.`
      };
    }

    if (action === 'set_secret_file') {
      if (!ctx.input.secretFileName)
        throw createApiServiceError('secretFileName is required for set_secret_file');
      if (ctx.input.secretFileContent === undefined)
        throw createApiServiceError('secretFileContent is required for set_secret_file');
      let secretFile = await client.setEnvGroupSecretFile(
        envGroupId,
        ctx.input.secretFileName,
        ctx.input.secretFileContent
      );
      return {
        output: {
          secretFile: { name: secretFile.name ?? ctx.input.secretFileName },
          success: true
        },
        message: `Set secret file \`${ctx.input.secretFileName}\` on environment group \`${envGroupId}\`.`
      };
    }

    if (action === 'delete_secret_file') {
      if (!ctx.input.secretFileName)
        throw createApiServiceError('secretFileName is required for delete_secret_file');
      await client.deleteEnvGroupSecretFile(envGroupId, ctx.input.secretFileName);
      return {
        output: { success: true },
        message: `Deleted secret file \`${ctx.input.secretFileName}\` from environment group \`${envGroupId}\`.`
      };
    }

    return { output: { success: false }, message: 'Unknown action.' };
  })
  .build();
