import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let alertFired = SlateTrigger.create(spec, {
  name: 'Alert Fired',
  key: 'alert_fired',
  description:
    'Triggers when a Splunk alert fires and sends a webhook notification. Configure a saved search with a webhook alert action pointing to the provided webhook URL.'
})
  .input(
    z.object({
      searchName: z.string().describe('Name of the saved search that triggered the alert'),
      searchId: z.string().describe('Search job ID (SID) of the triggering search'),
      app: z.string().optional().describe('App context of the alert'),
      owner: z.string().optional().describe('Owner of the alert'),
      resultsLink: z.string().optional().describe('Link to the search results'),
      resultCount: z.number().optional().describe('Number of results in the alert'),
      rawPayload: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full raw webhook payload from Splunk')
    })
  )
  .output(
    z.object({
      searchName: z.string().describe('Name of the saved search that triggered'),
      searchId: z.string().describe('Search job ID'),
      app: z.string().optional().describe('App context'),
      owner: z.string().optional().describe('Owner of the alert'),
      resultsLink: z.string().optional().describe('Link to view the search results'),
      resultCount: z.number().optional().describe('Number of results'),
      results: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Result rows included in the webhook payload')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: Record<string, any>;
      try {
        body = (await ctx.request.json()) as Record<string, any>;
      } catch {
        return { inputs: [] };
      }

      if (!body?.search_name) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            searchName: body.search_name || '',
            searchId: body.sid || body.search_id || '',
            app: body.app,
            owner: body.owner,
            resultsLink: body.results_link,
            resultCount: typeof body.result_count === 'number' ? body.result_count : undefined,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let results: Record<string, any>[] | undefined;
      if (ctx.input.rawPayload?.result) {
        results = Array.isArray(ctx.input.rawPayload.result)
          ? ctx.input.rawPayload.result
          : [ctx.input.rawPayload.result];
      } else if (ctx.input.rawPayload?.results) {
        results = Array.isArray(ctx.input.rawPayload.results)
          ? ctx.input.rawPayload.results
          : [ctx.input.rawPayload.results];
      }

      return {
        type: 'alert.fired',
        id: `${ctx.input.searchId}-${ctx.input.searchName}`,
        output: {
          searchName: ctx.input.searchName,
          searchId: ctx.input.searchId,
          app: ctx.input.app,
          owner: ctx.input.owner,
          resultsLink: ctx.input.resultsLink,
          resultCount: ctx.input.resultCount,
          results
        }
      };
    }
  })
  .build();
