import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let codeMonitorNotification = SlateTrigger.create(spec, {
  name: 'Code Monitor Notification',
  key: 'code_monitor_notification',
  description:
    'Triggered when a code monitor detects matching changes in new commits. Receives webhook notifications from Sourcegraph code monitors.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      monitorDescription: z.string().optional().describe('Description of the code monitor'),
      monitorUrl: z.string().optional().describe('URL of the code monitor on Sourcegraph'),
      query: z.string().optional().describe('Search query that triggered the notification'),
      matchedCommits: z
        .array(
          z.object({
            repository: z.string().optional(),
            diffRanges: z
              .array(
                z.object({
                  startLine: z.number().optional(),
                  endLine: z.number().optional()
                })
              )
              .optional(),
            commitOid: z.string().optional()
          })
        )
        .optional()
    })
  )
  .output(
    z.object({
      monitorDescription: z
        .string()
        .optional()
        .describe('Description of the code monitor that fired'),
      monitorUrl: z.string().optional().describe('URL of the code monitor on Sourcegraph'),
      query: z.string().optional().describe('Search query that matched'),
      matchedCommits: z
        .array(
          z.object({
            repository: z.string().optional(),
            diffRanges: z
              .array(
                z.object({
                  startLine: z.number().optional(),
                  endLine: z.number().optional()
                })
              )
              .optional(),
            commitOid: z.string().optional()
          })
        )
        .optional()
        .describe('Commits that matched the monitor query')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Code monitor webhook notification payload
      let monitorDescription =
        body.monitorDescription || body.monitor_description || body.description || '';
      let monitorUrl = body.monitorURL || body.monitor_url || body.monitorUrl || '';
      let query = body.query || '';

      let matchedCommits: any[] = [];
      if (body.results || body.matches) {
        let results = body.results || body.matches || [];
        matchedCommits = results.map((r: any) => ({
          repository: r.repository || r.repo,
          diffRanges: (r.diffRanges || r.diff_ranges || []).map((dr: any) => ({
            startLine: dr.startLine || dr.start_line,
            endLine: dr.endLine || dr.end_line
          })),
          commitOid: r.commit || r.commitOid || r.oid
        }));
      }

      return {
        inputs: [
          {
            eventId: `code-monitor-${Date.now()}`,
            monitorDescription,
            monitorUrl,
            query,
            matchedCommits
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'code_monitor.triggered',
        id: ctx.input.eventId,
        output: {
          monitorDescription: ctx.input.monitorDescription,
          monitorUrl: ctx.input.monitorUrl,
          query: ctx.input.query,
          matchedCommits: ctx.input.matchedCommits
        }
      };
    }
  })
  .build();
