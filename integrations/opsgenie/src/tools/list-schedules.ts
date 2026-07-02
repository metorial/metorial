import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

export let listSchedules = SlateTool.create(spec, {
  name: 'List Schedules',
  key: 'list_schedules',
  description: `List all on-call schedules. Optionally expand to include rotation details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      expandRotations: z
        .boolean()
        .optional()
        .describe('Whether to include rotation details in the response')
    })
  )
  .output(
    z.object({
      schedules: z.array(
        z.object({
          scheduleId: z.string().describe('Schedule ID'),
          name: z.string().describe('Schedule name'),
          description: z.string().optional().describe('Schedule description'),
          timezone: z.string().optional().describe('Schedule timezone'),
          enabled: z.boolean().describe('Whether the schedule is enabled'),
          ownerTeam: z
            .object({
              teamId: z.string().optional().describe('Team ID'),
              name: z.string().optional().describe('Team name')
            })
            .optional()
            .describe('Owning team')
        })
      ),
      totalCount: z.number().describe('Number of schedules returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let data = await client.listSchedules(
      ctx.input.expandRotations ? { expand: 'rotation' } : {}
    );
    let schedules = (data ?? []).map((s: any) => ({
      scheduleId: s.id,
      name: s.name,
      description: s.description,
      timezone: s.timezone,
      enabled: s.enabled ?? true,
      ownerTeam: s.ownerTeam
        ? {
            teamId: s.ownerTeam.id,
            name: s.ownerTeam.name
          }
        : undefined
    }));

    return {
      output: {
        schedules,
        totalCount: schedules.length
      },
      message: `Found **${schedules.length}** schedules.`
    };
  })
  .build();
