import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let jobRunEventTrigger = SlateTrigger.create(spec, {
  name: 'Job Run Event',
  key: 'job_run_event',
  description:
    'Triggers when a dbt Cloud job run starts, completes, or errors. Receives real-time webhook notifications with run and job details.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of event (job.run.started, job.run.completed, job.run.errored)'),
      eventId: z.string().describe('Unique event identifier'),
      accountId: z.number().describe('Account ID'),
      webhookId: z.string().describe('Webhook subscription ID that triggered this event'),
      webhookName: z.string().describe('Name of the webhook subscription'),
      timestamp: z.string().describe('Event timestamp'),
      jobId: z.string().describe('Job ID'),
      jobName: z.string().describe('Job name'),
      runId: z.string().describe('Run ID'),
      runStatus: z.string().describe('Run status text'),
      runStatusCode: z.number().describe('Run status code'),
      runReason: z.string().optional().describe('Reason for the run'),
      environmentId: z.string().optional().describe('Environment ID'),
      environmentName: z.string().optional().describe('Environment name'),
      projectId: z.string().optional().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      dbtVersion: z.string().optional().describe('dbt version used'),
      runStartedAt: z.string().optional().describe('Run start timestamp'),
      runFinishedAt: z.string().optional().describe('Run finish timestamp')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('Unique run identifier'),
      jobId: z.string().describe('Job that produced this run'),
      jobName: z.string().describe('Name of the job'),
      runStatus: z.string().describe('Human-readable run status'),
      runStatusCode: z
        .number()
        .describe(
          'Run status code (1=Queued, 2=Starting, 3=Running, 10=Success, 20=Error, 30=Cancelled)'
        ),
      accountId: z.number().describe('Account ID'),
      environmentId: z.string().optional().describe('Environment ID'),
      environmentName: z.string().optional().describe('Environment name'),
      projectId: z.string().optional().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      dbtVersion: z.string().optional().describe('dbt version used'),
      runReason: z.string().optional().describe('Reason for the run'),
      runStartedAt: z.string().optional().describe('Run start timestamp'),
      runFinishedAt: z.string().optional().describe('Run finish timestamp'),
      webhookName: z.string().describe('Name of the webhook subscription'),
      timestamp: z.string().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountId: ctx.config.accountId,
        baseUrl: ctx.config.baseUrl
      });

      let webhook = await client.createWebhook({
        name: `Slates - Job Run Events`,
        clientUrl: ctx.input.webhookBaseUrl,
        eventTypes: ['job.run.started', 'job.run.completed', 'job.run.errored'],
        active: true
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          hmacSecret: webhook.hmac_secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountId: ctx.config.accountId,
        baseUrl: ctx.config.baseUrl
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventData = data.data ?? {};

      return {
        inputs: [
          {
            eventType: data.eventType ?? data.event_type ?? 'unknown',
            eventId: data.eventId ?? data.event_id ?? '',
            accountId: data.accountId ?? data.account_id ?? 0,
            webhookId: data.webhookId ?? data.webhook_id ?? '',
            webhookName: data.webhookName ?? data.webhook_name ?? '',
            timestamp: data.timestamp ?? '',
            jobId: String(eventData.jobId ?? eventData.job_id ?? ''),
            jobName: eventData.jobName ?? eventData.job_name ?? '',
            runId: String(eventData.runId ?? eventData.run_id ?? ''),
            runStatus: eventData.runStatus ?? eventData.run_status ?? '',
            runStatusCode: eventData.runStatusCode ?? eventData.run_status_code ?? 0,
            runReason: eventData.runReason ?? eventData.run_reason,
            environmentId:
              eventData.environmentId != null
                ? String(eventData.environmentId)
                : eventData.environment_id != null
                  ? String(eventData.environment_id)
                  : undefined,
            environmentName: eventData.environmentName ?? eventData.environment_name,
            projectId:
              eventData.projectId != null
                ? String(eventData.projectId)
                : eventData.project_id != null
                  ? String(eventData.project_id)
                  : undefined,
            projectName: eventData.projectName ?? eventData.project_name,
            dbtVersion: eventData.dbtVersion ?? eventData.dbt_version,
            runStartedAt: eventData.runStartedAt ?? eventData.run_started_at,
            runFinishedAt: eventData.runFinishedAt ?? eventData.run_finished_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          runId: ctx.input.runId,
          jobId: ctx.input.jobId,
          jobName: ctx.input.jobName,
          runStatus: ctx.input.runStatus,
          runStatusCode: ctx.input.runStatusCode,
          accountId: ctx.input.accountId,
          environmentId: ctx.input.environmentId,
          environmentName: ctx.input.environmentName,
          projectId: ctx.input.projectId,
          projectName: ctx.input.projectName,
          dbtVersion: ctx.input.dbtVersion,
          runReason: ctx.input.runReason,
          runStartedAt: ctx.input.runStartedAt,
          runFinishedAt: ctx.input.runFinishedAt,
          webhookName: ctx.input.webhookName,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
