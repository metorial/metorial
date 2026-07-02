import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { KadoaClient } from '../lib/client';
import { spec } from '../spec';

export let kadoaEvents = SlateTrigger.create(spec, {
  name: 'Kadoa Events',
  key: 'kadoa_events',
  description:
    'Receive webhook events from Kadoa including workflow completions, data changes, failures, and monitoring alerts.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Event type (e.g., workflow_finished, workflow_failed, workflow_data_change)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      workflowId: z.string().optional().describe('Associated workflow ID'),
      workflowName: z.string().optional().describe('Associated workflow name'),
      payload: z.any().describe('Full event payload from Kadoa')
    })
  )
  .output(
    z.object({
      workflowId: z.string().optional().describe('Workflow ID'),
      workflowName: z.string().optional().describe('Workflow name'),
      runId: z.string().optional().describe('Workflow run ID'),
      records: z.number().optional().describe('Number of records extracted'),
      status: z.string().optional().describe('Run status'),
      url: z.string().optional().describe('Source URL'),
      changesCount: z.number().optional().describe('Number of data changes detected'),
      errorMessage: z.string().optional().describe('Error message if the workflow failed'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new KadoaClient({ token: ctx.auth.token });

      let result = await client.subscribeWebhook({
        url: ctx.input.webhookBaseUrl,
        httpMethod: 'POST',
        events: [
          'workflow_started',
          'workflow_finished',
          'workflow_failed',
          'workflow_data_change',
          'workflow_sample_finished',
          'workflow_export_completed',
          'workflow_validation_anomaly_change'
        ]
      });

      return {
        registrationDetails: {
          subscriptionId: result.id || result.subscriptionId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new KadoaClient({ token: ctx.auth.token });

      let subscriptionId = ctx.input.registrationDetails?.subscriptionId;
      if (subscriptionId) {
        try {
          await client.unsubscribeWebhook(subscriptionId);
        } catch (e: any) {
          if (e?.response?.status !== 404) {
            throw e;
          }
        }
      }
    },

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data) {
        return { inputs: [] };
      }

      let eventType = data.eventType || data.event_type || data.type;
      if (!eventType) {
        return { inputs: [] };
      }

      let eventId =
        data.id ||
        data.eventId ||
        `${eventType}_${data.workflowId || ''}_${data.timestamp || Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId: String(eventId),
            workflowId: data.workflowId,
            workflowName: data.workflowName,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, payload } = ctx.input;

      let output: Record<string, any> = {
        workflowId: payload.workflowId,
        workflowName: payload.workflowName,
        timestamp: payload.timestamp || payload.createdAt
      };

      if (eventType === 'workflow_finished' || eventType === 'workflow_sample_finished') {
        output.runId = payload.runId || payload.jobId;
        output.records = payload.records || payload.totalRecords;
        output.status = 'finished';
        output.url = payload.url;
      }

      if (eventType === 'workflow_failed') {
        output.runId = payload.runId || payload.jobId;
        output.status = 'failed';
        output.errorMessage = payload.error || payload.message || payload.errorMessage;
        output.url = payload.url;
      }

      if (eventType === 'workflow_started') {
        output.runId = payload.runId || payload.jobId;
        output.status = 'running';
        output.url = payload.url;
      }

      if (eventType === 'workflow_data_change') {
        output.changesCount = payload.changesCount || payload.changes?.length;
        output.status = 'data_changed';
        output.url = payload.url;
      }

      if (eventType === 'workflow_export_completed') {
        output.status = 'export_completed';
        output.runId = payload.runId || payload.jobId;
      }

      if (eventType === 'workflow_validation_anomaly_change') {
        output.status = 'validation_anomaly';
        output.runId = payload.runId || payload.jobId;
      }

      return {
        type: eventType.replace(/_/g, '.'),
        id: ctx.input.eventId,
        output
      };
    }
  })
  .build();
