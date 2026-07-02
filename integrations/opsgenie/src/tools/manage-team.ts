import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { opsgenieServiceError } from '../lib/errors';
import { spec } from '../spec';

let memberSchema = z.object({
  userId: z.string().optional().describe('User ID'),
  username: z.string().optional().describe('User email/username'),
  role: z.enum(['admin', 'user']).optional().describe('Member role in the team')
});

export let manageTeam = SlateTool.create(spec, {
  name: 'Manage Team',
  key: 'manage_team',
  description: `Create, update, or delete a team. Teams are the organizational unit for on-call schedules, escalation policies, and alert routing. When updating members, note that the members list replaces the entire existing list.`,
  instructions: [
    'To create: set action to "create" and provide at least a name.',
    'To update: set action to "update" and provide teamId plus the fields to change.',
    'To delete: set action to "delete" and provide teamIdentifier.',
    'When updating members, provide the complete desired members list — it replaces the existing list entirely.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      teamId: z.string().optional().describe('Team ID (required for update)'),
      teamIdentifier: z.string().optional().describe('Team ID or name (for delete)'),
      identifierType: z
        .enum(['id', 'name'])
        .optional()
        .describe('Type of team identifier for delete. Defaults to "id"'),
      name: z.string().optional().describe('Team name (required for create, max 100 chars)'),
      description: z.string().optional().describe('Team description (max 200 chars)'),
      members: z
        .array(memberSchema)
        .optional()
        .describe('Team members. For update, this replaces the entire members list.')
    })
  )
  .output(
    z.object({
      teamId: z.string().optional().describe('Team ID'),
      name: z.string().optional().describe('Team name'),
      result: z.string().describe('Operation result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let membersPayload = ctx.input.members?.map(m => ({
      user: m.userId ? { id: m.userId } : { username: m.username },
      role: m.role
    }));

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.name) {
          throw opsgenieServiceError('name is required when creating a team.');
        }
        let team = await client.createTeam({
          name: ctx.input.name,
          description: ctx.input.description,
          members: membersPayload
        });
        return {
          output: {
            teamId: team.id,
            name: team.name ?? ctx.input.name,
            result: 'Team created successfully'
          },
          message: `Created team **${ctx.input.name}**`
        };
      }
      case 'update': {
        if (!ctx.input.teamId) {
          throw opsgenieServiceError('teamId is required when updating a team.');
        }
        let updated = await client.updateTeam(ctx.input.teamId, {
          name: ctx.input.name,
          description: ctx.input.description,
          members: membersPayload
        });
        return {
          output: {
            teamId: updated.id ?? ctx.input.teamId,
            name: updated.name,
            result: 'Team updated successfully'
          },
          message: `Updated team **${updated.name ?? ctx.input.teamId}**`
        };
      }
      case 'delete': {
        let identifier = ctx.input.teamIdentifier ?? ctx.input.teamId;
        if (!identifier) {
          throw opsgenieServiceError(
            'teamIdentifier or teamId is required when deleting a team.'
          );
        }
        await client.deleteTeam(identifier, ctx.input.identifierType ?? 'id');
        return {
          output: {
            result: 'Team deleted successfully'
          },
          message: `Deleted team \`${identifier}\``
        };
      }
    }
  })
  .build();
