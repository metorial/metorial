import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

export let codingActivityTrigger = SlateTrigger.create(spec, {
  name: 'Coding Activity',
  key: 'coding_activity',
  description:
    'Polls for daily coding activity summaries. Triggers when new coding activity is detected for the current day or recent days, providing time breakdowns by project, language, editor, and more.'
})
  .input(
    z.object({
      date: z.string().describe('Date of the summary (YYYY-MM-DD)'),
      totalSeconds: z.number().describe('Total seconds of coding activity'),
      totalText: z.string().describe('Human-readable total time'),
      projects: z
        .array(
          z.object({
            name: z.string(),
            totalSeconds: z.number(),
            text: z.string()
          })
        )
        .describe('Project breakdown'),
      languages: z
        .array(
          z.object({
            name: z.string(),
            totalSeconds: z.number(),
            text: z.string()
          })
        )
        .describe('Language breakdown'),
      editors: z
        .array(
          z.object({
            name: z.string(),
            totalSeconds: z.number(),
            text: z.string()
          })
        )
        .describe('Editor breakdown'),
      categories: z
        .array(
          z.object({
            name: z.string(),
            totalSeconds: z.number(),
            text: z.string()
          })
        )
        .describe('Category breakdown')
    })
  )
  .output(
    z.object({
      date: z.string().describe('Date of the coding activity (YYYY-MM-DD)'),
      totalSeconds: z.number().describe('Total seconds of coding activity'),
      totalText: z.string().describe('Human-readable total time'),
      projects: z
        .array(
          z.object({
            name: z.string().describe('Project name'),
            totalSeconds: z.number().describe('Total seconds on this project'),
            text: z.string().describe('Human-readable time')
          })
        )
        .describe('Time breakdown by project'),
      languages: z
        .array(
          z.object({
            name: z.string().describe('Language name'),
            totalSeconds: z.number().describe('Total seconds in this language'),
            text: z.string().describe('Human-readable time')
          })
        )
        .describe('Time breakdown by language'),
      editors: z
        .array(
          z.object({
            name: z.string().describe('Editor name'),
            totalSeconds: z.number().describe('Total seconds in this editor'),
            text: z.string().describe('Human-readable time')
          })
        )
        .describe('Time breakdown by editor'),
      categories: z
        .array(
          z.object({
            name: z.string().describe('Category name'),
            totalSeconds: z.number().describe('Total seconds in this category'),
            text: z.string().describe('Human-readable time')
          })
        )
        .describe('Time breakdown by category')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new WakaTimeClient({ token: ctx.auth.token });

      let today = new Date().toISOString().split('T')[0] ?? '';

      let result = await client.getSummaries({
        start: today,
        end: today
      });

      let inputs: Array<{
        date: string;
        totalSeconds: number;
        totalText: string;
        projects: Array<{ name: string; totalSeconds: number; text: string }>;
        languages: Array<{ name: string; totalSeconds: number; text: string }>;
        editors: Array<{ name: string; totalSeconds: number; text: string }>;
        categories: Array<{ name: string; totalSeconds: number; text: string }>;
      }> = [];

      let previousTotalSeconds = (ctx.state as any)?.lastTotalSeconds ?? 0;
      let previousDate = (ctx.state as any)?.lastDate ?? '';

      for (let day of result.data || []) {
        let totalSeconds = day.grand_total?.total_seconds ?? 0;
        let date = day.range?.date ?? today;

        // Only emit if there's new activity (more seconds than last check, or new day)
        if (
          totalSeconds > 0 &&
          (totalSeconds !== previousTotalSeconds || date !== previousDate)
        ) {
          let mapItems = (items: any[]) =>
            (items || []).map((i: any) => ({
              name: i.name ?? '',
              totalSeconds: i.total_seconds ?? 0,
              text: i.text ?? '0 secs'
            }));

          inputs.push({
            date,
            totalSeconds,
            totalText: day.grand_total?.text ?? '0 secs',
            projects: mapItems(day.projects),
            languages: mapItems(day.languages),
            editors: mapItems(day.editors),
            categories: mapItems(day.categories)
          });
        }
      }

      let lastDay = result.data?.[result.data.length - 1];

      return {
        inputs,
        updatedState: {
          lastTotalSeconds: lastDay?.grand_total?.total_seconds ?? previousTotalSeconds,
          lastDate: lastDay?.range?.date ?? previousDate
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'coding_activity.updated',
        id: `${ctx.input.date}-${ctx.input.totalSeconds}`,
        output: {
          date: ctx.input.date,
          totalSeconds: ctx.input.totalSeconds,
          totalText: ctx.input.totalText,
          projects: ctx.input.projects,
          languages: ctx.input.languages,
          editors: ctx.input.editors,
          categories: ctx.input.categories
        }
      };
    }
  })
  .build();
