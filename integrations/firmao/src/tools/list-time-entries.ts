import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let listTimeEntries = SlateTool.create(spec, {
  name: 'List Time Entries',
  key: 'list_time_entries',
  description: `Search and list work time entries from Firmao. Supports filtering by user and pagination. Returns start/end times, linked tasks, and descriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.number().optional().describe('Offset for pagination'),
      limit: z.number().optional().describe('Maximum results to return'),
      sort: z.string().optional().describe('Field to sort by'),
      dir: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      userId: z.number().optional().describe('Filter by user ID')
    })
  )
  .output(
    z.object({
      timeEntries: z.array(
        z.object({
          timeEntryId: z.number(),
          userId: z.number().optional(),
          taskId: z.number().optional(),
          dateTimeFrom: z.string().optional(),
          dateTimeTo: z.string().optional(),
          description: z.string().optional(),
          type: z.string().optional(),
          creationDate: z.string().optional()
        })
      ),
      totalSize: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let filters: Record<string, string> = {};
    if (ctx.input.userId !== undefined) filters['user(eq)'] = String(ctx.input.userId);

    let result = await client.list('timeentries', {
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      dir: ctx.input.dir,
      filters
    });

    let timeEntries = result.data.map((t: any) => ({
      timeEntryId: t.id,
      userId: typeof t.user === 'object' ? t.user?.id : t.user,
      taskId: typeof t.task === 'object' ? t.task?.id : t.task,
      dateTimeFrom: t.dateTimeFrom,
      dateTimeTo: t.dateTimeTo,
      description: t.description,
      type: t.type,
      creationDate: t.creationDate
    }));

    return {
      output: { timeEntries, totalSize: result.totalSize },
      message: `Found **${timeEntries.length}** time entry(ies) (total: ${result.totalSize}).`
    };
  })
  .build();
