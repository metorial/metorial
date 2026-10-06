import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let manageApplication = SlateTool.create(spec, {
  name: 'Manage Application',
  key: 'manage_application',
  description: `Create, update, delete, publish, clone, or fork an Appsmith application. Uses version-sensitive dashboard session endpoints. Publishing or public access can expose data; updates to name and public access are separate writes. Exact get reads the authorized base-application inventory, excluding branch-specific discovery.`,
  instructions: [
    'To create: set action to "create", provide workspaceId and name.',
    'To update: set action to "update", provide applicationId and fields to change.',
    'To delete: set action to "delete", provide applicationId.',
    'To publish: set action to "publish", provide applicationId.',
    'To clone: set action to "clone", provide applicationId (clones within same workspace).',
    'To get: set action to "get" and provide applicationId.',
    'To fork: set action to "fork", provide applicationId and targetWorkspaceId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'publish', 'clone', 'fork', 'get'])
        .describe('The action to perform.'),
      applicationId: z
        .string()
        .optional()
        .describe('Application ID. Required for update, delete, publish, clone, and fork.'),
      workspaceId: z.string().optional().describe('Workspace ID. Required for create.'),
      targetWorkspaceId: z
        .string()
        .optional()
        .describe('Target workspace ID for fork action.'),
      name: z
        .string()
        .optional()
        .describe('Application name. Required for create, optional for update.'),
      isPublic: z
        .boolean()
        .optional()
        .describe('Whether the application should be publicly accessible (for update).'),
      color: z.string().optional().describe('Theme color for the application (for create).'),
      icon: z.string().optional().describe('Icon identifier for the application (for create).')
    })
  )
  .output(
    z.object({
      applicationId: z.string().optional().describe('Application ID.'),
      name: z.string().optional().describe('Application name.'),
      slug: z.string().optional().describe('Application URL slug.'),
      isPublic: z
        .boolean()
        .optional()
        .describe('Whether the application is publicly accessible.'),
      deleted: z.boolean().optional().describe('Whether the application was deleted.'),
      published: z.boolean().optional().describe('Whether the application was published.')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    const input = ctx.input;
    const key = input.applicationId ?? '';
    if (input.action === 'delete') {
      const app = await client.deleteApplication(key);
      return {
        output: { applicationId: app.id, deleted: true },
        message:
          'Appsmith accepted deletion of the exact application. History and external query effects may remain.'
      };
    }
    const app =
      input.action === 'create'
        ? await client.createApplication(
            input.workspaceId ?? '',
            input.name ?? '',
            input.color,
            input.icon
          )
        : input.action === 'update'
          ? await client.updateApplication(key, { name: input.name, isPublic: input.isPublic })
          : input.action === 'publish'
            ? await client.publishApplication(key)
            : input.action === 'clone'
              ? await client.cloneApplication(key)
              : input.action === 'fork'
                ? await client.forkApplication(key, input.targetWorkspaceId ?? '')
                : await client.getApplication(key);
    return {
      output: {
        applicationId: app.id,
        name: app.name,
        slug: app.slug,
        isPublic: app.isPublic,
        ...(input.action === 'publish' ? { published: true } : {})
      },
      message:
        input.action === 'publish'
          ? 'Appsmith acknowledged publication. This does not confirm external query execution.'
          : `Application ${input.action} confirmed by native readback.`
    };
  })
  .build();
