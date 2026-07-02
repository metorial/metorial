import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAveragesTool = SlateTool.create(spec, {
  name: 'Get Averages',
  key: 'get_averages',
  description: `Retrieve the most recent weekly average values for tracked attributes, including an overall average and per-day-of-week breakdowns (Monday through Sunday). Optionally retrieve historical averages to see trends over time.`,
  instructions: [
    'Set includeHistorical to true to get past weekly averages for trend analysis.',
    'Filter by groups or specific attribute names to narrow results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groups: z.string().optional().describe('Comma-separated group names to filter by'),
      attributeNames: z
        .string()
        .optional()
        .describe('Comma-separated attribute names to filter by'),
      includeHistorical: z.boolean().optional().describe('Include historical weekly averages'),
      dateMin: z
        .string()
        .optional()
        .describe('Earliest date for historical averages (YYYY-MM-DD)'),
      dateMax: z
        .string()
        .optional()
        .describe('Latest date for historical averages (YYYY-MM-DD)'),
      limit: z.number().optional().describe('Number of results per page'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of average records'),
      averages: z
        .array(
          z.object({
            attributeName: z.string().describe('Attribute name'),
            date: z.string().describe('Week date for the average'),
            overall: z.number().describe('Overall weekly average'),
            monday: z.number().describe('Monday average'),
            tuesday: z.number().describe('Tuesday average'),
            wednesday: z.number().describe('Wednesday average'),
            thursday: z.number().describe('Thursday average'),
            friday: z.number().describe('Friday average'),
            saturday: z.number().describe('Saturday average'),
            sunday: z.number().describe('Sunday average')
          })
        )
        .describe('List of attribute averages'),
      hasMore: z.boolean().describe('Whether there are more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.getAverages({
      groups: ctx.input.groups,
      attributes: ctx.input.attributeNames,
      includeHistorical: ctx.input.includeHistorical,
      dateMin: ctx.input.dateMin,
      dateMax: ctx.input.dateMax,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let averages = result.results.map(a => ({
      attributeName: a.attribute,
      date: a.date,
      overall: a.overall,
      monday: a.monday,
      tuesday: a.tuesday,
      wednesday: a.wednesday,
      thursday: a.thursday,
      friday: a.friday,
      saturday: a.saturday,
      sunday: a.sunday
    }));

    return {
      output: {
        totalCount: result.count,
        averages,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** average record(s). Returned ${averages.length} on this page.`
    };
  })
  .build();
