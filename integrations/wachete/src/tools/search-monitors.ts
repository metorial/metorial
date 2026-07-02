import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchMonitors = SlateTool.create(spec, {
  name: 'Search Monitors',
  key: 'search_monitors',
  description: `Searches for monitors (wachets) by a text query. Returns up to 500 matching monitors with their configurations and latest data.`,
  constraints: ['Maximum 500 results returned per search.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Search query to find monitors by name, URL, or other attributes')
    })
  )
  .output(
    z.object({
      monitors: z
        .array(
          z.object({
            wachetId: z.string().optional().describe('Monitor ID'),
            name: z.string().optional().describe('Monitor name'),
            url: z.string().optional().describe('Monitored URL'),
            jobType: z.string().optional().describe('Monitor type'),
            recurrenceInSeconds: z.number().optional().describe('Check frequency in seconds'),
            lastCheckTimestamp: z
              .string()
              .optional()
              .describe('When the monitor last checked'),
            lastValue: z.string().optional().describe('Last captured content value'),
            lastError: z.string().optional().describe('Last error if any')
          })
        )
        .describe('List of matching monitors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.searchWachets(ctx.input.query);

    let monitors = results.map(w => ({
      wachetId: w.id,
      name: w.name,
      url: w.url,
      jobType: w.jobType,
      recurrenceInSeconds: w.recurrenceInSeconds,
      lastCheckTimestamp: w.data?.lastCheckTimestamp,
      lastValue: w.data?.raw,
      lastError: w.data?.error
    }));

    return {
      output: { monitors },
      message: `Found **${monitors.length}** monitor(s) matching "${ctx.input.query}".`
    };
  })
  .build();
