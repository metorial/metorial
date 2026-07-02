import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let policyViolationEvents = SlateTrigger.create(spec, {
  name: 'Policy Violation Events',
  key: 'policy_violation_events',
  description:
    'Triggered when policy violations occur during stack updates, including both mandatory and advisory violations.'
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
      enforcementLevel: z.string().optional(),
      result: z.string().optional(),
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
        displayName: `Slates Policy Violation Events Webhook`,
        payloadUrl: ctx.input.webhookBaseUrl,
        format: 'raw',
        filters: ['policy_violation_mandatory', 'policy_violation_advisory']
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

      let policyEventKinds = ['policy_violation_mandatory', 'policy_violation_advisory'];

      if (!policyEventKinds.includes(kind)) {
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
      let enforcementLevel =
        ctx.input.kind === 'policy_violation_mandatory' ? 'mandatory' : 'advisory';

      return {
        type: `policy_violation.${enforcementLevel}`,
        id: ctx.input.webhookId,
        output: {
          organizationName: payload.organization?.name,
          projectName: payload.projectName,
          stackName: payload.stackName,
          updateUrl: payload.updateUrl,
          enforcementLevel,
          result: payload.result,
          userName: payload.user?.name
        }
      };
    }
  })
  .build();
