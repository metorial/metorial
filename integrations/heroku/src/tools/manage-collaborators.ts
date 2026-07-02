import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { herokuServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageCollaborators = SlateTool.create(spec, {
  name: 'Manage Collaborators',
  key: 'manage_collaborators',
  description: `List, add, or remove collaborators who have access to a Heroku app. Collaborators can deploy and manage the app based on their permissions.`
})
  .input(
    z.object({
      appIdOrName: z.string().describe('App name or unique identifier'),
      action: z.enum(['list', 'add', 'remove']).describe('Operation to perform'),
      userEmail: z
        .string()
        .optional()
        .describe('Email of the collaborator (required for "add" and "remove")'),
      silent: z
        .boolean()
        .optional()
        .describe('Suppress invitation email when adding a collaborator')
    })
  )
  .output(
    z.object({
      collaborators: z
        .array(
          z.object({
            collaboratorId: z.string().describe('Unique identifier of the collaborator entry'),
            userEmail: z.string().describe('Email of the collaborator'),
            userId: z.string().describe('User ID of the collaborator'),
            role: z.string().nullable().describe('Role of the collaborator'),
            createdAt: z.string().describe('When the collaborator was added')
          })
        )
        .optional(),
      removed: z.boolean().optional().describe('Whether the collaborator was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { appIdOrName, action } = ctx.input;

    let mapCollab = (c: any) => ({
      collaboratorId: c.collaboratorId,
      userEmail: c.userEmail,
      userId: c.userId,
      role: c.role,
      createdAt: c.createdAt
    });

    if (action === 'list') {
      let collabs = await client.listCollaborators(appIdOrName);
      return {
        output: { collaborators: collabs.map(mapCollab) },
        message: `Found **${collabs.length}** collaborator(s) on app **${appIdOrName}**.`
      };
    }

    if (action === 'add') {
      if (!ctx.input.userEmail)
        throw herokuServiceError('userEmail is required for "add" action.');
      let collab = await client.addCollaborator(appIdOrName, {
        userEmail: ctx.input.userEmail,
        silent: ctx.input.silent
      });
      return {
        output: { collaborators: [mapCollab(collab)] },
        message: `Added **${collab.userEmail}** as collaborator on app **${appIdOrName}**.`
      };
    }

    // remove
    if (!ctx.input.userEmail)
      throw herokuServiceError('userEmail is required for "remove" action.');
    await client.removeCollaborator(appIdOrName, ctx.input.userEmail);
    return {
      output: { removed: true },
      message: `Removed **${ctx.input.userEmail}** from app **${appIdOrName}**.`
    };
  })
  .build();
