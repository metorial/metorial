import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  requireConfirmed,
  requiredString,
  responseData,
  responseRecord,
  teamIdSchema
} from '../lib/responses';
import { spec } from '../spec';

export let manageTeam = SlateTool.create(spec, {
  name: 'Manage Team',
  key: 'manage_team',
  description: `Create, edit, or delete a team in Planly. Teams are the top-level organizational unit and are required for most operations.
Use **create** to set up a new team, **edit** to rename an existing team, or **delete** to remove a team entirely.`,
  instructions: [
    'Most Planly operations require a teamId. Use the "List Teams" tool first to find available teams.',
    'Deleting a team is permanent and removes all associated data.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'edit', 'delete'])
        .describe('The operation to perform on the team'),
      teamId: teamIdSchema
        .optional()
        .describe('Team ID from list_teams (required for edit and delete actions)'),
      name: z.string().optional().describe('Team name. Required for create and edit actions')
    })
  )
  .output(
    z.object({
      teamId: z.string().optional().describe('ID of the created or affected team'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name?.trim()) {
        throw createApiServiceError('Name is required to create a team');
      }
      let result = responseRecord(
        responseData(await client.createTeam(ctx.input.name)),
        'created team'
      );
      let teamId = requiredString(result.teamId, 'created team ID');
      return {
        output: {
          teamId: teamId,
          success: true
        },
        message: `Team "${ctx.input.name}" created successfully with ID ${teamId}.`
      };
    }

    if (ctx.input.action === 'edit') {
      if (!ctx.input.teamId?.trim()) {
        throw createApiServiceError('teamId is required to edit a team');
      }
      if (!ctx.input.name?.trim()) {
        throw createApiServiceError('Name is required to edit a team');
      }
      await client.editTeam(ctx.input.teamId, ctx.input.name);
      return {
        output: {
          teamId: ctx.input.teamId,
          success: true
        },
        message: `Team ${ctx.input.teamId} renamed to "${ctx.input.name}".`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.teamId?.trim()) {
        throw createApiServiceError('teamId is required to delete a team');
      }
      requireConfirmed(await client.deleteTeam(ctx.input.teamId));
      return {
        output: {
          teamId: ctx.input.teamId,
          success: true
        },
        message: `Team ${ctx.input.teamId} deleted successfully.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  });
