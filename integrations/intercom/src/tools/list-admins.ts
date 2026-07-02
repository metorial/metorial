import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { arrayOrUndefined, booleanOrUndefined, stringOrUndefined } from '../lib/output';
import { spec } from '../spec';

export let listAdmins = SlateTool.create(spec, {
  name: 'List Admins',
  key: 'list_admins',
  description: `List all admins (teammates) in the Intercom workspace. Useful for finding admin IDs needed for other operations like assigning conversations or sending messages.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      admins: z
        .array(
          z.object({
            adminId: z.string().describe('Admin ID'),
            name: z.string().optional().describe('Admin name'),
            email: z.string().optional().describe('Admin email'),
            jobTitle: z.string().optional().describe('Admin job title'),
            awayModeEnabled: z.boolean().optional().describe('Whether admin is in away mode'),
            awayModeReassign: z
              .boolean()
              .optional()
              .describe('Whether to auto-reassign when away'),
            hasInboxSeat: z.boolean().optional().describe('Whether admin has inbox seat'),
            teamIds: z.array(z.number()).optional().describe('Team IDs the admin belongs to')
          })
        )
        .describe('List of admins in the workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.listAdmins();

    let admins = (result.admins || []).map((a: any) => ({
      adminId: String(a.id),
      name: stringOrUndefined(a.name),
      email: stringOrUndefined(a.email),
      jobTitle: stringOrUndefined(a.job_title),
      awayModeEnabled: booleanOrUndefined(a.away_mode_enabled),
      awayModeReassign: booleanOrUndefined(a.away_mode_reassign),
      hasInboxSeat: booleanOrUndefined(a.has_inbox_seat),
      teamIds: arrayOrUndefined(a.team_ids)
    }));

    return {
      output: { admins },
      message: `Found **${admins.length}** admins`
    };
  })
  .build();
