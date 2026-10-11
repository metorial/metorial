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
  description: `Create, update, or delete a team, or add/remove a single team member. Teams are the organizational unit for on-call schedules, escalation policies, and alert routing. When updating members, note that the members list replaces the entire existing list.`,
  instructions: [
    'To create: set action to "create" and provide at least a name.',
    'To update: set action to "update" and provide teamId plus the fields to change.',
    'To delete: set action to "delete" and provide teamIdentifier.',
    'When updating members, provide the complete desired members list — it replaces the existing list entirely.',
    'To add one member without replacing others: set action to "add_member", provide teamIdentifier (or teamId) and memberUserId or memberUsername, optionally memberRole.',
    'To remove one member: set action to "remove_member", provide teamIdentifier (or teamId) and memberUserId or memberUsername.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'add_member', 'remove_member'])
        .describe('Action to perform'),
      teamId: z.string().optional().describe('Team ID (required for update)'),
      teamIdentifier: z
        .string()
        .optional()
        .describe('Team ID or name (for delete, add_member, remove_member)'),
      identifierType: z
        .enum(['id', 'name'])
        .optional()
        .describe(
          'Type of teamIdentifier for delete, add_member, and remove_member. Defaults to "id"'
        ),
      memberUserId: z
        .string()
        .optional()
        .describe('User ID of the member (for add_member / remove_member)'),
      memberUsername: z
        .string()
        .optional()
        .describe('Username/email of the member (for add_member / remove_member)'),
      memberRole: z
        .enum(['admin', 'user'])
        .optional()
        .describe('Member role for add_member. Defaults to "user"'),
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
      case 'add_member':
      case 'remove_member': {
        let identifier = ctx.input.teamIdentifier ?? ctx.input.teamId;
        let identifierType = ctx.input.teamIdentifier
          ? (ctx.input.identifierType ?? 'id')
          : 'id';
        if (!identifier) {
          throw opsgenieServiceError(
            `teamIdentifier or teamId is required for the ${ctx.input.action} action.`
          );
        }
        let member = ctx.input.memberUserId ?? ctx.input.memberUsername;
        if (!member) {
          throw opsgenieServiceError(
            `memberUserId or memberUsername is required for the ${ctx.input.action} action.`
          );
        }

        let response =
          ctx.input.action === 'add_member'
            ? await client.addTeamMember(identifier, identifierType, {
                user: ctx.input.memberUserId
                  ? { id: ctx.input.memberUserId }
                  : { username: ctx.input.memberUsername },
                role: ctx.input.memberRole
              })
            : await client.removeTeamMember(identifier, identifierType, member);

        let verb = ctx.input.action === 'add_member' ? 'Added' : 'Removed';
        return {
          output: {
            teamId: response?.data?.id,
            name: response?.data?.name,
            result: response?.result ?? `${verb} team member`
          },
          message: `${verb} \`${member}\` ${ctx.input.action === 'add_member' ? 'to' : 'from'} team **${response?.data?.name ?? identifier}**`
        };
      }
    }
  })
  .build();
