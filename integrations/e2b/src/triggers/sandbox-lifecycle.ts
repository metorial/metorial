import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { E2BClient } from '../lib/client';
import { spec } from '../spec';

let signatureSecret = () => {
  let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

export let sandboxLifecycleTrigger = SlateTrigger.create(spec, {
  name: 'Sandbox Lifecycle',
  key: 'sandbox_lifecycle',
  description:
    'Receive real-time notifications for sandbox lifecycle events including creation, termination, updates, pause, resume, and snapshots.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The lifecycle event type (e.g., sandbox.lifecycle.created).'),
      eventId: z.string().describe('Unique identifier of the event.'),
      sandboxId: z.string().describe('ID of the sandbox that triggered the event.'),
      sandboxTemplateId: z.string().describe('Template ID of the sandbox.'),
      sandboxTeamId: z.string().describe('Team ID that owns the sandbox.'),
      sandboxBuildId: z.string().describe('Build ID of the sandbox.'),
      sandboxExecutionId: z.string().describe('Execution ID of the sandbox.'),
      timestamp: z.string().describe('ISO 8601 timestamp of the event.'),
      eventData: z.any().optional().describe('Event-specific metadata.')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique identifier of the event.'),
      sandboxId: z.string().describe('ID of the affected sandbox.'),
      sandboxTemplateId: z.string().describe('Template ID of the sandbox.'),
      sandboxTeamId: z.string().describe('Team ID that owns the sandbox.'),
      sandboxBuildId: z.string().describe('Build ID of the sandbox.'),
      sandboxExecutionId: z.string().describe('Execution ID of the sandbox.'),
      timestamp: z.string().describe('ISO 8601 timestamp of the event.'),
      sandboxMetadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata attached to the sandbox.'),
      executionStartedAt: z
        .string()
        .optional()
        .describe('UTC timestamp when the sandbox execution started.'),
      vcpuCount: z.number().optional().describe('Number of vCPUs allocated to the sandbox.'),
      memoryMb: z
        .number()
        .optional()
        .describe('Memory allocated to the sandbox in megabytes.'),
      executionTimeMs: z.number().optional().describe('Total execution time in milliseconds.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new E2BClient({ token: ctx.auth.token });
      let secret = signatureSecret();

      let webhook = await client.createWebhook({
        name: 'Slates Sandbox Lifecycle Webhook',
        url: ctx.input.webhookBaseUrl,
        enabled: true,
        events: [
          'sandbox.lifecycle.created',
          'sandbox.lifecycle.updated',
          'sandbox.lifecycle.killed',
          'sandbox.lifecycle.paused',
          'sandbox.lifecycle.resumed',
          'sandbox.lifecycle.checkpointed'
        ],
        signatureSecret: secret
      });

      return {
        registrationDetails: {
          webhookId: webhook.webhookId,
          signatureSecret: secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new E2BClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.type || '',
            eventId: data.id || '',
            sandboxId: data.sandboxId || data.sandboxID || '',
            sandboxTemplateId: data.sandboxTemplateId || data.sandboxTemplateID || '',
            sandboxTeamId: data.sandboxTeamId || data.sandboxTeamID || '',
            sandboxBuildId: data.sandboxBuildId || data.sandboxBuildID || '',
            sandboxExecutionId: data.sandboxExecutionId || data.sandboxExecutionID || '',
            timestamp: data.timestamp || '',
            eventData: data.eventData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventData = ctx.input.eventData || {};
      let execution = eventData?.execution || {};
      let sandboxMetadata = eventData?.sandbox_metadata;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          eventId: ctx.input.eventId,
          sandboxId: ctx.input.sandboxId,
          sandboxTemplateId: ctx.input.sandboxTemplateId,
          sandboxTeamId: ctx.input.sandboxTeamId,
          sandboxBuildId: ctx.input.sandboxBuildId,
          sandboxExecutionId: ctx.input.sandboxExecutionId,
          timestamp: ctx.input.timestamp,
          sandboxMetadata: sandboxMetadata,
          executionStartedAt: execution.started_at,
          vcpuCount: execution.vcpu_count,
          memoryMb: execution.memory_mb,
          executionTimeMs: execution.execution_time
        }
      };
    }
  })
  .build();
