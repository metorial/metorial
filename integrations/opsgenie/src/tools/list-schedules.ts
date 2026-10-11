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
            .describe('Owning team'),
          rotations: z
            .array(
              z.object({
                rotationId: z.string().optional().describe('Rotation ID'),
                name: z.string().optional().describe('Rotation name'),
                type: z.string().optional().describe('Rotation type (daily, weekly, hourly)'),
                length: z.number().optional().describe('Rotation length'),
                startDate: z.string().optional().describe('Rotation start date'),
                endDate: z.string().optional().describe('Rotation end date'),
                participants: z
                  .array(
                    z.object({
                      type: z.string().optional().describe('Participant type'),
                      id: z.string().optional().describe('Participant ID'),
                      name: z
                        .string()
                        .optional()
                        .describe('Participant name (team/escalation)'),
                      username: z.string().optional().describe('Participant username (user)')
                    })
                  )
                  .optional()
                  .describe('Rotation participants in rotation order')
              })
            )
            .optional()
            .describe('Schedule rotations (only when expandRotations is true)')
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
        : undefined,
      rotations: Array.isArray(s.rotations)
        ? s.rotations.map((r: any) => ({
            rotationId: r.id,
            name: r.name,
            type: r.type,
            length: r.length,
            startDate: r.startDate,
            endDate: r.endDate,
            participants: Array.isArray(r.participants)
              ? r.participants.map((p: any) => ({
                  type: p.type,
                  id: p.id,
                  name: p.name,
                  username: p.username
                }))
              : undefined
          }))
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
