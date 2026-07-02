import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageApplication = SlateTool.create(spec, {
  name: 'Manage Application',
  key: 'manage_application',
  description: `Create, update, delete, publish, clone, or fork an Appsmith application. Provides full lifecycle management for applications within workspaces.`,
  instructions: [
    'To create: set action to "create", provide workspaceId and name.',
    'To update: set action to "update", provide applicationId and fields to change.',
    'To delete: set action to "delete", provide applicationId.',
    'To publish: set action to "publish", provide applicationId.',
    'To clone: set action to "clone", provide applicationId (clones within same workspace).',
    'To fork: set action to "fork", provide applicationId and targetWorkspaceId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'publish', 'clone', 'fork'])
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
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let {
      action,
      applicationId,
      workspaceId,
      targetWorkspaceId,
      name,
      isPublic,
      color,
      icon
    } = ctx.input;

    if (action === 'create') {
      if (!workspaceId) throw new Error('Workspace ID is required to create an application.');
      if (!name) throw new Error('Name is required to create an application.');
      let app = await client.createApplication(workspaceId, name, color, icon);
      return {
        output: {
          applicationId: app.id,
          name: app.name,
          slug: app.slug,
          isPublic: app.isPublic
        },
        message: `Created application **${app.name}** (ID: ${app.id}).`
      };
    }

    if (!applicationId) throw new Error('Application ID is required for this action.');

    if (action === 'update') {
      let updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (isPublic !== undefined) updates.isPublic = isPublic;
      let app = await client.updateApplication(applicationId, updates);
      return {
        output: {
          applicationId: app.id,
          name: app.name,
          slug: app.slug,
          isPublic: app.isPublic
        },
        message: `Updated application **${app.name}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteApplication(applicationId);
      return {
        output: { applicationId, deleted: true },
        message: `Deleted application ${applicationId}.`
      };
    }

    if (action === 'publish') {
      await client.publishApplication(applicationId);
      return {
        output: { applicationId, published: true },
        message: `Published application ${applicationId}.`
      };
    }

    if (action === 'clone') {
      let app = await client.cloneApplication(applicationId);
      return {
        output: {
          applicationId: app.id,
          name: app.name,
          slug: app.slug
        },
        message: `Cloned application. New application: **${app.name}** (ID: ${app.id}).`
      };
    }

    if (action === 'fork') {
      if (!targetWorkspaceId)
        throw new Error('Target workspace ID is required for fork action.');
      let app = await client.forkApplication(applicationId, targetWorkspaceId);
      return {
        output: {
          applicationId: app.id,
          name: app.name,
          slug: app.slug
        },
        message: `Forked application to workspace ${targetWorkspaceId}. New application: **${app.name}** (ID: ${app.id}).`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
