import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listTeamsTool = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List all teams in the Sentry organization with their members and project assignments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      teams: z.array(
        z.object({
          teamId: z.string(),
          teamSlug: z.string(),
          name: z.string(),
          dateCreated: z.string().optional(),
          isMember: z.boolean().optional(),
          memberCount: z.number().optional(),
          hasAccess: z.boolean().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let teams = await client.listTeams({ cursor: ctx.input.cursor });

    let mapped = (teams || []).map((t: any) => ({
      teamId: String(t.id),
      teamSlug: t.slug || '',
      name: t.name || '',
      dateCreated: t.dateCreated,
      isMember: t.isMember,
      memberCount: t.memberCount,
      hasAccess: t.hasAccess
    }));

    return {
      output: { teams: mapped },
      message: `Found **${mapped.length}** teams in the organization.`
    };
  })
  .build();
