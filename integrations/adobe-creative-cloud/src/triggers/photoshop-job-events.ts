import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let photoshopJobEvents = SlateTrigger.create(spec, {
  name: 'Photoshop Job Completion Events',
  key: 'photoshop_job_events',
  description:
    'Triggers when an asynchronous Photoshop API job completes. Receives completion notifications via Adobe I/O Events webhooks, eliminating the need to poll for job status.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type identifier'),
      eventId: z.string().describe('Unique event ID'),
      jobId: z.string().optional().describe('Photoshop job ID'),
      jobStatus: z.string().optional().describe('Final job status'),
      outputs: z.array(z.any()).optional().describe('Job output details'),
      timestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Photoshop job ID'),
      jobStatus: z.string().optional().describe('Final job status (succeeded, failed)'),
      outputs: z
        .array(
          z.object({
            href: z.string().optional().describe('Output file URL'),
            storage: z.string().optional().describe('Storage type'),
            status: z.string().optional().describe('Output status')
          })
        )
        .optional()
        .describe('Output file details'),
      timestamp: z.string().optional().describe('When the job completed')
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

      if (body.challenge) {
        return { inputs: [] };
      }

      let events = Array.isArray(body) ? body : body.event ? [body] : [body];

      let inputs = events.map((event: any) => {
        let eventData = event.event || event;

        return {
          eventType: eventData.type || eventData['@type'] || 'job_completion',
          eventId: eventData.event_id || eventData.id || `${Date.now()}-${Math.random()}`,
          jobId:
            eventData.jobId ||
            eventData.job_id ||
            eventData.activitystreams_activity?.object?.id,
          jobStatus:
            eventData.status ||
            eventData.jobStatus ||
            eventData.activitystreams_activity?.object?.status,
          outputs:
            eventData.outputs ||
            eventData.output ||
            eventData.activitystreams_activity?.object?.outputs ||
            [],
          timestamp:
            eventData.timestamp ||
            eventData.created_at ||
            eventData.activitystreams_activity?.published
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let outputs = (ctx.input.outputs || []).map((o: any) => ({
        href: o.href || o._links?.self?.href,
        storage: o.storage,
        status: o.status
      }));

      return {
        type: `photoshop_job.${ctx.input.jobStatus || 'completed'}`,
        id: ctx.input.eventId,
        output: {
          jobId: ctx.input.jobId,
          jobStatus: ctx.input.jobStatus,
          outputs,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
