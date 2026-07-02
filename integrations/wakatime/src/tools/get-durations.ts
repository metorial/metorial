import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

export let getDurations = SlateTool.create(spec, {
  name: 'Get Durations',
  key: 'get_durations',
  description: `Retrieve coding activity for a given day as time duration blocks. Durations are created by joining heartbeats within the user's keystroke timeout preference (default 15 minutes). Can be filtered by project and sliced by different dimensions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      date: z.string().describe('Date to retrieve durations for in YYYY-MM-DD format'),
      project: z.string().optional().describe('Filter by project name'),
      branches: z.string().optional().describe('Filter by branch name(s), comma-separated'),
      timezone: z.string().optional().describe('Timezone for the date'),
      sliceBy: z
        .enum(['project', 'entity', 'language', 'editor', 'os', 'category', 'machine'])
        .optional()
        .describe('Dimension to slice durations by')
    })
  )
  .output(
    z.object({
      durations: z
        .array(
          z
            .object({
              project: z.string().describe('Project name'),
              time: z.number().describe('Start time as UNIX epoch'),
              duration: z.number().describe('Duration in seconds'),
              color: z.string().optional().describe('Color associated with the item'),
              entity: z.string().optional().describe('File or entity being worked on'),
              language: z.string().optional().describe('Programming language'),
              category: z.string().optional().describe('Activity category'),
              branch: z.string().optional().describe('Git branch name')
            })
            .passthrough()
        )
        .describe('Array of duration blocks'),
      branches: z.array(z.string()).optional().describe('Branches in the results'),
      totalDurationSeconds: z.number().describe('Total duration across all blocks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient({ token: ctx.auth.token });

    let result = await client.getDurations({
      date: ctx.input.date,
      project: ctx.input.project,
      branches: ctx.input.branches,
      timezone: ctx.input.timezone,
      sliceBy: ctx.input.sliceBy
    });

    let durations = (result.data || []).map((d: any) => ({
      project: d.project ?? '',
      time: d.time ?? 0,
      duration: d.duration ?? 0,
      color: d.color,
      entity: d.entity,
      language: d.language,
      category: d.category,
      branch: d.branch
    }));

    let totalDurationSeconds = durations.reduce(
      (sum: number, d: any) => sum + (d.duration || 0),
      0
    );

    let hours = Math.floor(totalDurationSeconds / 3600);
    let minutes = Math.floor((totalDurationSeconds % 3600) / 60);

    return {
      output: {
        durations,
        branches: result.branches,
        totalDurationSeconds
      },
      message: `Retrieved **${durations.length}** duration blocks for **${ctx.input.date}**. Total: **${hours}h ${minutes}m**.`
    };
  })
  .build();
