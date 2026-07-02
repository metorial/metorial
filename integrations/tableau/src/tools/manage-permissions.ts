import { SlateTool } from 'slates';
import { z } from 'zod';
import { tableauServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let managePermissions = SlateTool.create(spec, {
  name: 'Manage Permissions',
  key: 'manage_permissions',
  description: `Query, add, or delete permissions on Tableau resources (workbooks, datasources, projects, views, flows). Permissions are granted to users or groups with specific capability modes.`,
  instructions: [
    'For resourceType use the plural API path: "workbooks", "datasources", "projects", "views", "flows", or "collections".',
    'For delete, granteeType must be "users" or "groups" (plural).'
  ]
})
  .input(
    z.object({
      action: z.enum(['query', 'add', 'delete']).describe('Operation to perform'),
      resourceType: z
        .enum(['workbooks', 'datasources', 'projects', 'views', 'flows', 'collections'])
        .describe(
          'Resource type path: "workbooks", "datasources", "projects", "views", "flows", or "collections"'
        ),
      resourceId: z.string().describe('LUID of the resource'),
      permissions: z
        .array(
          z.object({
            granteeType: z
              .enum(['user', 'group'])
              .describe('Whether the grantee is a user or group'),
            granteeId: z.string().describe('LUID of the user or group'),
            capabilities: z
              .array(
                z.object({
                  name: z
                    .string()
                    .describe('Capability name (e.g., "Read", "Write", "ExportData")'),
                  mode: z.enum(['Allow', 'Deny']).describe('Permission mode')
                })
              )
              .describe('Capabilities to grant')
          })
        )
        .optional()
        .describe('Permissions to add (for add action)'),
      granteeType: z
        .enum(['users', 'groups'])
        .optional()
        .describe('Grantee type plural (for delete)'),
      granteeId: z.string().optional().describe('LUID of user or group (for delete)'),
      capabilityName: z.string().optional().describe('Capability name to delete (for delete)'),
      capabilityMode: z
        .enum(['Allow', 'Deny'])
        .optional()
        .describe('Capability mode to delete (for delete)')
    })
  )
  .output(
    z.object({
      permissions: z.any().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action, resourceType, resourceId } = ctx.input;

    if (action === 'query') {
      let perms = await client.queryPermissions(resourceType, resourceId);
      return {
        output: { permissions: perms },
        message: `Retrieved permissions for ${resourceType} \`${resourceId}\`.`
      };
    }

    if (action === 'add') {
      if (!ctx.input.permissions?.length) {
        throw tableauServiceError('permissions is required for add action.');
      }

      let perms = await client.addPermissions(resourceType, resourceId, ctx.input.permissions);
      return {
        output: { permissions: perms },
        message: `Added permissions to ${resourceType} \`${resourceId}\`.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.granteeType) {
        throw tableauServiceError('granteeType is required for delete action.');
      }
      if (!ctx.input.granteeId) {
        throw tableauServiceError('granteeId is required for delete action.');
      }
      if (!ctx.input.capabilityName) {
        throw tableauServiceError('capabilityName is required for delete action.');
      }
      if (!ctx.input.capabilityMode) {
        throw tableauServiceError('capabilityMode is required for delete action.');
      }

      await client.deletePermission(
        resourceType,
        resourceId,
        ctx.input.granteeType,
        ctx.input.granteeId,
        ctx.input.capabilityName,
        ctx.input.capabilityMode
      );
      return {
        output: { deleted: true },
        message: `Deleted ${ctx.input.capabilityName} (${ctx.input.capabilityMode}) permission from ${resourceType} \`${resourceId}\`.`
      };
    }

    throw tableauServiceError(`Unknown action: ${action}`);
  })
  .build();
