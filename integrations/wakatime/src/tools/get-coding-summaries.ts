import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

let breakdownItemSchema = z
  .object({
    name: z.string().describe('Name of the item (e.g., language name, project name)'),
    totalSeconds: z.number().describe('Total seconds spent'),
    percent: z.number().describe('Percentage of total time'),
    digital: z.string().describe('Digital time format (e.g., "2:30")'),
    text: z.string().describe('Human-readable time (e.g., "2 hrs 30 mins")')
  })
  .passthrough();

let dailySummarySchema = z
  .object({
    grandTotal: z
      .object({
        totalSeconds: z.number().describe('Total seconds of coding activity'),
        digital: z.string().describe('Digital time format'),
        text: z.string().describe('Human-readable total time')
      })
      .passthrough(),
    projects: z.array(breakdownItemSchema).describe('Time breakdown by project'),
    languages: z.array(breakdownItemSchema).describe('Time breakdown by language'),
    editors: z.array(breakdownItemSchema).describe('Time breakdown by editor'),
    operatingSystems: z.array(breakdownItemSchema).describe('Time breakdown by OS'),
    categories: z.array(breakdownItemSchema).describe('Time breakdown by category'),
    dependencies: z.array(breakdownItemSchema).describe('Time breakdown by dependency'),
    machines: z.array(breakdownItemSchema).describe('Time breakdown by machine'),
    range: z
      .object({
        date: z.string().describe('Date of the summary (YYYY-MM-DD)'),
        start: z.string().describe('Start datetime of the range'),
        end: z.string().describe('End datetime of the range'),
        text: z.string().describe('Human-readable date range'),
        timezone: z.string().describe('Timezone used')
      })
      .passthrough()
  })
  .passthrough();

export let getCodingSummaries = SlateTool.create(spec, {
  name: 'Get Coding Summaries',
  key: 'get_coding_summaries',
  description: `Retrieve coding activity summaries for a given date range, segmented by day. Each day includes time breakdowns by project, language, editor, operating system, category, dependencies, and machine. Useful for understanding how coding time was distributed across a period.`,
  instructions: ['Dates must be in YYYY-MM-DD format.', 'The maximum date range is 365 days.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
      project: z.string().optional().describe('Filter by project name'),
      branches: z.string().optional().describe('Filter by branch name(s), comma-separated'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for the date range (e.g., "America/New_York")')
    })
  )
  .output(
    z.object({
      cumulativeTotal: z
        .object({
          seconds: z.number().describe('Total seconds across entire range'),
          text: z.string().describe('Human-readable total time')
        })
        .passthrough(),
      dailySummaries: z.array(dailySummarySchema).describe('Array of daily summaries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient({ token: ctx.auth.token });

    let result = await client.getSummaries({
      start: ctx.input.startDate,
      end: ctx.input.endDate,
      project: ctx.input.project,
      branches: ctx.input.branches,
      timezone: ctx.input.timezone
    });

    let dailySummaries = (result.data || []).map((day: any) => ({
      grandTotal: {
        totalSeconds: day.grand_total?.total_seconds ?? 0,
        digital: day.grand_total?.digital ?? '0:00',
        text: day.grand_total?.text ?? '0 secs',
        ...day.grand_total
      },
      projects: (day.projects || []).map((p: any) => ({
        name: p.name,
        totalSeconds: p.total_seconds ?? 0,
        percent: p.percent ?? 0,
        digital: p.digital ?? '0:00',
        text: p.text ?? '0 secs'
      })),
      languages: (day.languages || []).map((l: any) => ({
        name: l.name,
        totalSeconds: l.total_seconds ?? 0,
        percent: l.percent ?? 0,
        digital: l.digital ?? '0:00',
        text: l.text ?? '0 secs'
      })),
      editors: (day.editors || []).map((e: any) => ({
        name: e.name,
        totalSeconds: e.total_seconds ?? 0,
        percent: e.percent ?? 0,
        digital: e.digital ?? '0:00',
        text: e.text ?? '0 secs'
      })),
      operatingSystems: (day.operating_systems || []).map((o: any) => ({
        name: o.name,
        totalSeconds: o.total_seconds ?? 0,
        percent: o.percent ?? 0,
        digital: o.digital ?? '0:00',
        text: o.text ?? '0 secs'
      })),
      categories: (day.categories || []).map((c: any) => ({
        name: c.name,
        totalSeconds: c.total_seconds ?? 0,
        percent: c.percent ?? 0,
        digital: c.digital ?? '0:00',
        text: c.text ?? '0 secs'
      })),
      dependencies: (day.dependencies || []).map((d: any) => ({
        name: d.name,
        totalSeconds: d.total_seconds ?? 0,
        percent: d.percent ?? 0,
        digital: d.digital ?? '0:00',
        text: d.text ?? '0 secs'
      })),
      machines: (day.machines || []).map((m: any) => ({
        name: m.name,
        totalSeconds: m.total_seconds ?? 0,
        percent: m.percent ?? 0,
        digital: m.digital ?? '0:00',
        text: m.text ?? '0 secs'
      })),
      range: {
        date: day.range?.date ?? '',
        start: day.range?.start ?? '',
        end: day.range?.end ?? '',
        text: day.range?.text ?? '',
        timezone: day.range?.timezone ?? ''
      }
    }));

    let totalSeconds = result.cumulative_total?.seconds ?? 0;
    let totalText = result.cumulative_total?.text ?? '0 secs';

    return {
      output: {
        cumulativeTotal: {
          seconds: totalSeconds,
          text: totalText
        },
        dailySummaries
      },
      message: `Retrieved coding summaries from **${ctx.input.startDate}** to **${ctx.input.endDate}**. Total: **${totalText}** across **${dailySummaries.length}** day(s).`
    };
  })
  .build();
