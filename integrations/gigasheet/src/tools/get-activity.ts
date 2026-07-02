import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let getActivity = SlateTool.create(spec, {
  name: 'Get Activity History',
  key: 'get_activity',
  description: `Retrieve the audit and activity history for a Gigasheet sheet. Shows actions performed on the dataset, with support for searching through activity logs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sheetHandle: z.string().describe('Handle of the sheet to get activity for'),
      searchQuery: z.string().optional().describe('Search query to filter activity logs')
    })
  )
  .output(
    z.object({
      activities: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Activity history entries'),
      totalCount: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Total count of activities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });

    let activities: unknown[];

    if (ctx.input.searchQuery) {
      activities = await client.searchActivityHistory(
        ctx.input.sheetHandle,
        ctx.input.searchQuery
      );
    } else {
      activities = await client.getActivityHistory(ctx.input.sheetHandle);
    }

    let totalCount = await client.getActivityCount(ctx.input.sheetHandle);

    let items = Array.isArray(activities) ? activities : [];

    return {
      output: {
        activities: items as Record<string, unknown>[],
        totalCount
      },
      message: `Retrieved **${items.length}** activity entries for the sheet.`
    };
  })
  .build();
