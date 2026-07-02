import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { StitchConnectClient } from '../lib/client';
import { spec } from '../spec';

export let extractionStatusTrigger = SlateTrigger.create(spec, {
  name: 'Extraction Job Status',
  key: 'extraction_job_status',
  description:
    '[Polling fallback] Polls for new or updated extraction jobs. Triggers when extraction jobs complete, fail, or change status. Requires the Stitch client ID in configuration.'
})
  .input(
    z.object({
      jobName: z.string().describe('Extraction job name/ID'),
      sourceId: z.number().nullable().describe('ID of the source being extracted'),
      status: z.string().describe('Job status'),
      startedAt: z.string().nullable().describe('ISO 8601 start timestamp'),
      completedAt: z.string().nullable().describe('ISO 8601 completion timestamp'),
      rawExtraction: z.any().describe('Full extraction job record')
    })
  )
  .output(
    z.object({
      jobName: z.string().describe('Extraction job name/ID'),
      sourceId: z.number().nullable().describe('ID of the source'),
      status: z.string().describe('Job status'),
      startedAt: z.string().nullable().describe('ISO 8601 start timestamp'),
      completedAt: z.string().nullable().describe('ISO 8601 completion timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new StitchConnectClient({
        token: ctx.auth.token,
        region: ctx.config.region,
        clientId: ctx.config.clientId
      });

      let result = await client.listExtractions();
      let extractions =
        result?.data || result?.extractions || (Array.isArray(result) ? result : []);

      let lastPollTime = ctx.state?.lastPollTime || '1970-01-01T00:00:00Z';

      // Filter to only new/updated extractions since last poll
      let newExtractions = extractions.filter((e: any) => {
        let completedAt = e.completed_at || e.completion_time;
        let startedAt = e.started_at || e.start_time;
        let relevantTime = completedAt || startedAt || '';
        return relevantTime > lastPollTime;
      });

      let latestTime = lastPollTime;
      for (let e of newExtractions) {
        let t = e.completed_at || e.completion_time || e.started_at || e.start_time || '';
        if (t > latestTime) latestTime = t;
      }

      return {
        inputs: newExtractions.map((e: any) => ({
          jobName: e.job_name || e.id?.toString() || 'unknown',
          sourceId: e.source_id ?? null,
          status: e.status || 'unknown',
          startedAt: e.started_at || e.start_time || null,
          completedAt: e.completed_at || e.completion_time || null,
          rawExtraction: e
        })),
        updatedState: {
          lastPollTime: latestTime
        }
      };
    },

    handleEvent: async ctx => {
      let statusSuffix = ctx.input.status.toLowerCase().replace(/\s+/g, '_');

      return {
        type: `extraction.${statusSuffix}`,
        id: ctx.input.jobName,
        output: {
          jobName: ctx.input.jobName,
          sourceId: ctx.input.sourceId,
          status: ctx.input.status,
          startedAt: ctx.input.startedAt,
          completedAt: ctx.input.completedAt
        }
      };
    }
  })
  .build();
