import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageTeamTool = SlateTool.create(spec, {
  name: 'Manage Team',
  key: 'manage_team',
  description: `Create, update, or delete a team. Also supports assigning or removing projects from a team.`,
  instructions: [
    'To create: provide name and optionally slug',
    'To update: provide teamSlug and name or new slug',
    'To delete: provide teamSlug and set action to "delete"',
    'To assign/remove a project: set action to "assign_project" or "remove_project" with teamSlug and projectSlug'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'assign_project', 'remove_project'])
        .describe('Action to perform'),
      teamSlug: z
        .string()
        .optional()
        .describe('Team slug (required for update/delete/assign/remove)'),
      projectSlug: z
        .string()
        .optional()
        .describe('Project slug (required for assign_project/remove_project)'),
      name: z.string().optional().describe('Team name (required for create)'),
      slug: z.string().optional().describe('Team slug to set')
    })
  )
  .output(
    z.object({
      teamId: z.string().optional(),
      teamSlug: z.string().optional(),
      name: z.string().optional(),
      deleted: z.boolean().optional(),
      projectAssigned: z.boolean().optional(),
      projectRemoved: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required when creating a team');

      let team = await client.createTeam({
        name: ctx.input.name,
        slug: ctx.input.slug
      });

      return {
        output: {
          teamId: String(team.id),
          teamSlug: team.slug,
          name: team.name
        },
        message: `Created team **${team.slug}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.teamSlug) throw new Error('teamSlug is required when updating a team');

      let team = await client.updateTeam(ctx.input.teamSlug, {
        name: ctx.input.name,
        slug: ctx.input.slug
      });

      return {
        output: {
          teamId: String(team.id),
          teamSlug: team.slug,
          name: team.name
        },
        message: `Updated team **${team.slug}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.teamSlug) throw new Error('teamSlug is required when deleting a team');

      await client.deleteTeam(ctx.input.teamSlug);

      return {
        output: {
          teamSlug: ctx.input.teamSlug,
          deleted: true
        },
        message: `Deleted team **${ctx.input.teamSlug}**.`
      };
    }

    if (ctx.input.action === 'assign_project') {
      if (!ctx.input.teamSlug) throw new Error('teamSlug is required');
      if (!ctx.input.projectSlug) throw new Error('projectSlug is required');

      await client.addProjectToTeam(ctx.input.teamSlug, ctx.input.projectSlug);

      return {
        output: {
          teamSlug: ctx.input.teamSlug,
          projectAssigned: true
        },
        message: `Assigned project **${ctx.input.projectSlug}** to team **${ctx.input.teamSlug}**.`
      };
    }

    if (ctx.input.action === 'remove_project') {
      if (!ctx.input.teamSlug) throw new Error('teamSlug is required');
      if (!ctx.input.projectSlug) throw new Error('projectSlug is required');

      await client.removeProjectFromTeam(ctx.input.teamSlug, ctx.input.projectSlug);

      return {
        output: {
          teamSlug: ctx.input.teamSlug,
          projectRemoved: true
        },
        message: `Removed project **${ctx.input.projectSlug}** from team **${ctx.input.teamSlug}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
