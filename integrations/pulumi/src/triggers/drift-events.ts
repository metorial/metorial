import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let driftEvents = SlateTrigger.create(spec, {
  name: 'Drift Detection Events',
  key: 'drift_events',
  description:
    'Triggered when drift detection or remediation events occur, including drift detected, detection succeeded/failed, and remediation succeeded/failed.'
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
      result: z.string().optional(),
      resourceChanges: z.record(z.string(), z.number()).optional(),
      userName: z.string().optional()
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
        displayName: `Slates Drift Detection Events Webhook`,
        payloadUrl: ctx.input.webhookBaseUrl,
        format: 'raw',
        filters: [
          'drift_detected',
          'drift_detection_succeeded',
          'drift_detection_failed',
          'drift_remediation_succeeded',
          'drift_remediation_failed'
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

      let driftEventKinds = [
        'drift_detected',
        'drift_detection_succeeded',
        'drift_detection_failed',
        'drift_remediation_succeeded',
        'drift_remediation_failed'
      ];

      if (!driftEventKinds.includes(kind)) {
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
        type: `drift.${ctx.input.kind}`,
        id: ctx.input.webhookId,
        output: {
          organizationName: payload.organization?.name,
          projectName: payload.projectName,
          stackName: payload.stackName,
          updateUrl: payload.updateUrl,
          result: payload.result,
          resourceChanges: payload.resourceChanges,
          userName: payload.user?.name
        }
      };
    }
  })
  .build();
