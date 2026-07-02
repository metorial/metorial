import { SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
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
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'remove', 'list']).describe('The collaborator action to perform'),
      collaboratorId: z.string().optional().describe('Collaborator ID (required for remove)'),
      email: z
        .string()
        .optional()
        .describe('Email address of the user to add (required for add)'),
      spaceRoleId: z.number().optional().describe('Space role ID to assign to the user')
    })
  )
  .output(
    z.object({
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
    let client = new StoryblokClient({
      token: ctx.auth.token,
      region: ctx.auth.region,
      spaceId: ctx.config.spaceId
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let collaborators = await client.listCollaborators();
      return {
        output: {
          collaborators: collaborators.map(c => ({
            collaboratorId: c.id,
            firstname: c.firstname,
            lastname: c.lastname,
            email: c.user?.email,
            role: c.role
          }))
        },
        message: `Found **${collaborators.length}** collaborators.`
      };
    }

    if (action === 'add') {
      if (!ctx.input.email) throw new Error('Email is required to add a collaborator');
      let collaborator = await client.addCollaborator({
        email: ctx.input.email,
        spaceRoleId: ctx.input.spaceRoleId
      });
      return {
        output: {
          collaboratorId: collaborator.id,
          email: ctx.input.email
        },
        message: `Added collaborator **${ctx.input.email}** (\`${collaborator.id}\`).`
      };
    }

    // action === 'remove'
    if (!ctx.input.collaboratorId)
      throw new Error('collaboratorId is required to remove a collaborator');
    await client.removeCollaborator(ctx.input.collaboratorId);
    return {
      output: { collaboratorId: Number.parseInt(ctx.input.collaboratorId, 10) },
      message: `Removed collaborator \`${ctx.input.collaboratorId}\`.`
    };
  })
  .build();
