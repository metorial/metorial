import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let stackEvents = SlateTrigger.create(spec, {
  name: 'Stack Events',
  key: 'stack_events',
  description:
    'Triggered when stack lifecycle events occur, including updates, previews, destroys, refreshes, and stack creation/deletion.'
})
  .input(
    z.object({
      webhookId: z.string().describe('Pulumi webhook delivery ID'),
      kind: z.string().describe('Event kind'),
      payload: z.any().describe('Webhook event payload')
    })
  )
  .output(
    z.object({
      organizationName: z.string().optional(),
      projectName: z.string().optional(),
      stackName: z.string().optional(),
      updateUrl: z.string().optional(),
      operationKind: z.string().optional(),
      result: z.string().optional(),
      isPreview: z.boolean().optional(),
      resourceChanges: z.record(z.string(), z.number()).optional(),
      userName: z.string().optional(),
      userLogin: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let org = ctx.config.organization;
      if (!org)
        throw new Error('Organization must be set in config for webhook auto-registration.');

      let result = await client.createOrgWebhook(org, {
        active: true,
        displayName: `Slates Stack Events Webhook`,
        payloadUrl: ctx.input.webhookBaseUrl,
        format: 'raw',
        filters: [
          'stack_created',
          'stack_deleted',
          'preview_succeeded',
          'preview_failed',
          'update_succeeded',
          'update_failed',
          'destroy_succeeded',
          'destroy_failed',
          'refresh_succeeded',
          'refresh_failed'
        ]
      });

      return {
        registrationDetails: {
          webhookName: result.name,
          organizationName: org
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let details = ctx.input.registrationDetails as {
        webhookName: string;
        organizationName: string;
      };
      await client.deleteOrgWebhook(details.organizationName, details.webhookName);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let webhookId = ctx.request.headers.get('Pulumi-Webhook-ID') || '';
      let kind = ctx.request.headers.get('Pulumi-Webhook-Kind') || body.kind || '';

      // Only process stack-related events
      let stackEventKinds = [
        'stack_created',
        'stack_deleted',
        'preview_succeeded',
        'preview_failed',
        'update_succeeded',
        'update_failed',
        'destroy_succeeded',
        'destroy_failed',
        'refresh_succeeded',
        'refresh_failed'
      ];

      if (!stackEventKinds.includes(kind)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            webhookId,
            kind,
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload;

      return {
        type: `stack.${ctx.input.kind}`,
        id: ctx.input.webhookId,
        output: {
          organizationName: payload.organization?.name,
          projectName: payload.projectName,
          stackName: payload.stackName,
          updateUrl: payload.updateUrl,
          operationKind: payload.kind,
          result: payload.result,
          isPreview: payload.isPreview,
          resourceChanges: payload.resourceChanges,
          userName: payload.user?.name,
          userLogin: payload.user?.githubLogin
        }
      };
    }
  })
  .build();
