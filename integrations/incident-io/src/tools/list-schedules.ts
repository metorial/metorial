import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSchedules = SlateTool.create(spec, {
  name: 'List Schedules',
  key: 'list_schedules',
  description: `List all on-call schedules configured in your incident.io account. Returns schedule names, timezones, rotation configurations, and team associations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z.number().min(1).max(250).optional().describe('Number of results per page'),
      after: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      schedules: z.array(
        z.object({
          scheduleId: z.string(),
          name: z.string(),
          timezone: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          currentShifts: z.array(z.any()).optional()
        })
      ),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSchedules({
      pageSize: ctx.input.pageSize,
      after: ctx.input.after
    });

    let schedules = result.schedules.map((s: any) => ({
      scheduleId: s.id,
      name: s.name,
      timezone: s.timezone || undefined,
      createdAt: s.created_at || undefined,
      updatedAt: s.updated_at || undefined,
      currentShifts: s.current_shifts || undefined
    }));

    return {
      output: {
        schedules,
        nextCursor: result.pagination_meta?.after || undefined
      },
      message: `Found **${schedules.length}** schedule(s).`
    };
  })
  .build();
