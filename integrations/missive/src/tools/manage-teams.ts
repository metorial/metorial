import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let teamOutputSchema = z.object({
  teamId: z.string().describe('Team ID'),
  name: z.string().optional().describe('Team name'),
  emoji: z.string().optional().describe('Team emoji'),
  organizationId: z.string().optional().describe('Organization ID'),
  activeMembers: z.array(z.string()).optional().describe('Active member user IDs'),
  observers: z.array(z.string()).optional().describe('Observer user IDs')
});

export let manageTeams = SlateTool.create(spec, {
  name: 'Manage Teams',
  key: 'manage_teams',
  description: `List, create, or update teams within organizations. Configure team membership, observers, and mention notification behavior.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update']).describe('Action to perform'),
      teamId: z.string().optional().describe('Team ID (required for update)'),
      organizationId: z.string().optional().describe('Organization ID (required for create)'),
      name: z.string().optional().describe('Team name'),
      emoji: z.string().optional().describe('Team emoji'),
      activeMembers: z.array(z.string()).optional().describe('Active member user IDs'),
      observers: z.array(z.string()).optional().describe('Observer user IDs'),
      mentionNotification: z
        .enum(['all_members', 'only_active_members'])
        .optional()
        .describe('Who gets notified on team mention'),
      limit: z.number().min(1).max(200).optional().describe('Max teams to return (list only)'),
      offset: z.number().optional().describe('Pagination offset (list only)')
    })
  )
  .output(
    z.object({
      teams: z.array(teamOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let params: Record<string, string | number> = {};
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.offset) params.offset = ctx.input.offset;

      let data = await client.listTeams(params);
      let teams = (data.teams || []).map((t: any) => ({
        teamId: t.id,
        name: t.name,
        emoji: t.emoji,
        organizationId: t.organization?.id,
        activeMembers: t.active_members?.map((m: any) => (typeof m === 'string' ? m : m.id)),
        observers: t.observers?.map((o: any) => (typeof o === 'string' ? o : o.id))
      }));

      return {
        output: { teams },
        message: `Retrieved **${teams.length}** teams.`
      };
    }

    let fields: Record<string, any> = {};
    if (ctx.input.name) fields.name = ctx.input.name;
    if (ctx.input.emoji) fields.emoji = ctx.input.emoji;
    if (ctx.input.activeMembers) fields.active_members = ctx.input.activeMembers;
    if (ctx.input.observers) fields.observers = ctx.input.observers;
    if (ctx.input.mentionNotification)
      fields.mention_notification = ctx.input.mentionNotification;

    if (ctx.input.action === 'create') {
      if (!ctx.input.organizationId)
        throw new Error('organizationId is required for creating teams');
      if (!ctx.input.name) throw new Error('name is required for creating teams');
      fields.organization = ctx.input.organizationId;
      let data = await client.createTeams(fields);
      let teams = Array.isArray(data.teams) ? data.teams : [data.teams];
      return {
        output: {
          teams: teams.map((t: any) => ({
            teamId: t.id,
            name: t.name,
            emoji: t.emoji,
            organizationId: t.organization?.id,
            activeMembers: t.active_members?.map((m: any) =>
              typeof m === 'string' ? m : m.id
            ),
            observers: t.observers?.map((o: any) => (typeof o === 'string' ? o : o.id))
          }))
        },
        message: `Created team **${ctx.input.name}**.`
      };
    }

    // update
    if (!ctx.input.teamId) throw new Error('teamId is required for updating teams');
    let data = await client.updateTeams([ctx.input.teamId], fields);
    let teams = Array.isArray(data.teams) ? data.teams : [data.teams];
    return {
      output: {
        teams: teams.map((t: any) => ({
          teamId: t.id,
          name: t.name,
          emoji: t.emoji,
          organizationId: t.organization?.id,
          activeMembers: t.active_members?.map((m: any) => (typeof m === 'string' ? m : m.id)),
          observers: t.observers?.map((o: any) => (typeof o === 'string' ? o : o.id))
        }))
      },
      message: `Updated team **${ctx.input.teamId}**.`
    };
  })
  .build();
