import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateInteger } from '../lib/validation';
import { spec } from '../spec';

export let manageTeam = SlateTool.create(spec, {
  name: 'Manage Team',
  key: 'manage_team',
  description: `Create, update, or delete a team in your HackerRank for Work account. Teams are used to organize users for collaborative hiring workflows. To create a new team, omit the teamId and provide a name. To update or delete, provide the teamId.`,
  instructions: [
    'To create a new team, omit the teamId and provide at least a team name.',
    'To update a team, provide the teamId and any fields to change.',
    'To delete a team, set the "remove" field to true. Only empty teams can be deleted.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      teamId: z
        .string()
        .optional()
        .describe('ID of an existing team to update or delete. Omit to create a new team.'),
      name: z.string().optional().describe('Name of the team (required when creating)'),
      description: z.string().optional().describe('Description of the team'),
      recruiterCap: z.number().optional().describe('Recruiter license capacity for the team'),
      developerCap: z.number().optional().describe('Developer license capacity for the team'),
      inviteAs: z
        .string()
        .optional()
        .describe('Display name used on candidate invitation emails'),
      locations: z.array(z.string()).optional().describe('Team locations'),
      departments: z.array(z.string()).optional().describe('Team departments'),
      remove: z.boolean().optional().describe('Set to true to delete the team (must be empty)')
    })
  )
  .output(
    z.object({
      team: z
        .record(z.string(), z.any())
        .optional()
        .describe('Team object (absent if deleted)'),
      deleted: z.boolean().optional().describe('Whether the team was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.remove && !ctx.input.teamId)
      throw createApiServiceError('Provide teamId to delete an existing team.');
    validateInteger(ctx.input.recruiterCap, 'recruiterCap');
    validateInteger(ctx.input.developerCap, 'developerCap');
    let settings = {
      name: ctx.input.name,
      description: ctx.input.description,
      recruiter_cap: ctx.input.recruiterCap,
      developer_cap: ctx.input.developerCap,
      invite_as: ctx.input.inviteAs,
      locations: ctx.input.locations,
      departments: ctx.input.departments
    };
    if (ctx.input.remove && Object.values(settings).some(value => value !== undefined))
      throw createApiServiceError(
        'Deleting a team cannot be combined with updating team fields.'
      );
    if (ctx.input.teamId && ctx.input.remove) {
      await client.deleteTeam(ctx.input.teamId);
      return {
        output: {
          deleted: true
        },
        message: `Deleted team **${ctx.input.teamId}**.`
      };
    }

    if (ctx.input.teamId) {
      let updateData = Object.fromEntries(
        Object.entries(settings).filter(([, value]) => value !== undefined)
      );
      if (Object.keys(updateData).length === 0)
        throw createApiServiceError('Provide at least one team field to update.');

      let result = await client.updateTeam(ctx.input.teamId, updateData);
      let team = result.data ?? result;

      return {
        output: {
          team
        },
        message: `Updated team **${team.name ?? ctx.input.teamId}**.`
      };
    }

    if (!ctx.input.name) {
      throw createApiServiceError('Name is required when creating a new team.');
    }

    let result = await client.createTeam({
      ...settings,
      name: ctx.input.name
    });

    let team = result.data ?? result;

    return {
      output: {
        team
      },
      message: `Created team **${team.name ?? ctx.input.name}**.`
    };
  });
