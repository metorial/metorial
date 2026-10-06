import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { branches, pagingOutput, resolveSpace, spaceIdInput } from '../lib/validation';
import { spec } from '../spec';

export let manageCollaborator = SlateTool.create(spec, {
  name: 'Manage Collaborator',
  key: 'manage_collaborator',
  description: `Add, remove, or list collaborators (users) in the space. Use this to manage team access to your Storyblok space.`,
  instructions: [
    'To **add** a collaborator, set action to "add" and provide an email address.',
    'To **remove** a collaborator, set action to "remove" and provide the collaboratorId.',
    'To **list** all collaborators, set action to "list".'
  ],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      spaceId: spaceIdInput,
      action: z.enum(['add', 'remove', 'list']).describe('The collaborator action to perform'),
      collaboratorId: z.string().optional().describe('Collaborator ID (required for remove)'),
      email: z
        .string()
        .optional()
        .describe('Email address of the user to add (required for add)'),
      spaceRoleId: z
        .number()
        .optional()
        .describe(
          'Custom role ID from Get Space Info; the native numeric role selector is resolved and verified before invitation'
        ),
      role: z
        .string()
        .optional()
        .describe(
          'Explicit role for add: admin, editor, or an exact custom role ID/name from Get Space Info; custom roles resolve to their native numeric selector'
        ),
      page: z.number().optional().describe('Page for list; default 1'),
      perPage: z.number().optional().describe('Items per page for list; maximum 100')
    })
  )
  .output(
    z.object({
      ...pagingOutput,
      collaboratorId: z.number().optional().describe('ID of the affected collaborator'),
      email: z.string().optional().describe('Email of the collaborator'),
      collaborators: z
        .array(
          z.object({
            collaboratorId: z.number().optional(),
            firstname: z.string().optional(),
            lastname: z.string().optional(),
            email: z.string().optional(),
            role: z.string().optional()
          })
        )
        .optional()
        .describe('List of collaborators (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    branches(
      ctx.input,
      {
        add: ['email', 'role', 'spaceRoleId'],
        remove: ['collaboratorId'],
        list: ['page', 'perPage']
      }[ctx.input.action]
    );
    let client = new StoryblokClient({
      ...ctx.auth,
      spaceId: resolveSpace(
        ctx.input.spaceId,
        ctx.config.spaceId,
        ctx.auth.mode === 'oauth' ? ctx.auth.spaceId : undefined
      )
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listCollaborators(ctx.input);
      return {
        output: {
          ...result,
          collaborators: result.collaborators.map(c => ({
            collaboratorId: c.id,
            firstname: c.user?.firstname ?? c.firstname,
            lastname: c.user?.lastname ?? c.lastname,
            email: c.user?.real_email ?? c.user?.email ?? c.email,
            role: c.role
          }))
        },
        message: `Found **${result.collaborators.length}** collaborators.`
      };
    }

    if (action === 'add') {
      if (!ctx.input.email)
        throw createApiServiceError('Email is required to add a collaborator');
      let collaborator = await client.addCollaborator({
        email: ctx.input.email,
        spaceRoleId: ctx.input.spaceRoleId,
        role: ctx.input.role
      });
      return {
        output: {
          collaboratorId: collaborator.id,
          email:
            collaborator.user?.real_email ?? collaborator.user?.email ?? collaborator.email
        },
        message: `Added collaborator **${ctx.input.email}** (\`${collaborator.id}\`).`
      };
    }

    // action === 'remove'
    if (!ctx.input.collaboratorId)
      throw createApiServiceError('collaboratorId is required to remove a collaborator');
    await client.removeCollaborator(ctx.input.collaboratorId);
    return {
      output: { collaboratorId: Number(ctx.input.collaboratorId) },
      message: `Removed collaborator \`${ctx.input.collaboratorId}\`.`
    };
  })
  .build();
