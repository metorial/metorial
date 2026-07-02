import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let webhookPayloadSchema = z.object({
  triggerType: z
    .string()
    .describe(
      'Webhook trigger type (e.g., firstException, exception, reopened, projectSpiking)'
    ),
  triggerMessage: z.string().optional().describe('Human-readable trigger message'),
  accountId: z.string().optional().describe('Bugsnag account ID'),
  accountName: z.string().optional().describe('Bugsnag account name'),
  projectId: z.string().optional().describe('Project ID'),
  projectName: z.string().optional().describe('Project name'),
  errorId: z.string().optional().describe('Error group ID'),
  eventId: z.string().optional().describe('Specific event ID'),
  exceptionClass: z.string().optional().describe('Exception class name'),
  message: z.string().optional().describe('Error message'),
  context: z.string().optional().describe('Error context (e.g., controller#action)'),
  severity: z.string().optional().describe('Error severity: error, warning, or info'),
  unhandled: z.boolean().optional().describe('Whether the error was unhandled'),
  firstReceived: z.string().optional().describe('When the error was first seen'),
  receivedAt: z.string().optional().describe('When this event was received'),
  releaseStage: z.string().optional().describe('Release stage'),
  appVersion: z.string().optional().describe('App version'),
  errorUrl: z.string().optional().describe('Dashboard URL for the error'),
  userId: z.string().optional().describe('ID of the user who triggered the event'),
  userName: z.string().optional().describe('Name of the user'),
  userEmail: z.string().optional().describe('Email of the user'),
  releaseVersion: z.string().optional().describe('Release version (for release events)'),
  commentMessage: z.string().optional().describe('Comment text (for comment events)'),
  raw: z.any().optional().describe('Full raw webhook payload')
});

export let errorEvents = SlateTrigger.create(spec, {
  name: 'Error & Project Events',
  key: 'error_events',
  description:
    'Triggers on Bugsnag webhook events including new errors, error occurrences, frequent errors, error milestones, error reopened, error spikes, new releases, rate limiting, and comments. Configure the webhook URL in Bugsnag under Project Settings → Integrations and Email → Data Forwarding → Webhook.'
})
  .input(
    z.object({
      triggerType: z.string().describe('The webhook trigger type'),
      eventId: z.string().describe('Unique ID for deduplication'),
      payload: z.any().describe('Full webhook payload')
    })
  )
  .output(webhookPayloadSchema)
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let triggerType = data.trigger?.type || 'unknown';
      let eventId = data.error?.id || data.release?.id || `${triggerType}-${Date.now()}`;
      let uniqueId = `${eventId}-${data.error?.receivedAt || data.error?.received_at || Date.now()}`;

      return {
        inputs: [
          {
            triggerType,
            eventId: uniqueId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { payload, triggerType } = ctx.input;

      let triggerTypeMap: Record<string, string> = {
        firstException: 'error.new',
        exception: 'error.occurrence',
        errorEventFrequency: 'error.frequent',
        powerTen: 'error.milestone',
        reopened: 'error.reopened',
        projectSpiking: 'project.error_spike',
        release: 'project.new_release',
        projectSamplingStarted: 'project.rate_limited',
        projectApproachingRateLimit: 'project.rate_limit_approaching',
        comment: 'error.comment',
        errorStateManualChange: 'error.status_changed'
      };

      let type = triggerTypeMap[triggerType] || `error.${triggerType}`;

      let output: any = {
        triggerType,
        triggerMessage: payload.trigger?.message,
        accountId: payload.account?.id,
        accountName: payload.account?.name,
        projectId: payload.project?.id,
        projectName: payload.project?.name,
        errorId: payload.error?.errorId || payload.error?.error_id,
        eventId: payload.error?.id,
        exceptionClass: payload.error?.exceptionClass || payload.error?.exception_class,
        message: payload.error?.message,
        context: payload.error?.context,
        severity: payload.error?.severity,
        unhandled: payload.error?.unhandled,
        firstReceived: payload.error?.firstReceived || payload.error?.first_received,
        receivedAt: payload.error?.receivedAt || payload.error?.received_at,
        releaseStage:
          payload.error?.releaseStage ||
          payload.error?.release_stage ||
          payload.app?.releaseStage,
        appVersion: payload.app?.version || payload.release?.version,
        errorUrl: payload.error?.url,
        userId: payload.user?.id,
        userName: payload.user?.name,
        userEmail: payload.user?.email,
        releaseVersion: payload.release?.version,
        commentMessage: payload.comment?.message,
        raw: payload
      };

      return {
        type,
        id: ctx.input.eventId,
        output
      };
    }
  })
  .build();
