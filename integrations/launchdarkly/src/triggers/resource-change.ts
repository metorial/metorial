import { SlateTrigger, verifyHmacSignature } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { parseResourceSpecifiers } from '../lib/resource-specifier';
import { spec } from '../spec';

export let resourceChangeTrigger = SlateTrigger.create(spec, {
  name: 'Resource Changes',
  key: 'resource_changes',
  description:
    'Triggered when changes occur to LaunchDarkly resources (flags, projects, environments, segments, members, etc.). Uses webhooks with automatic registration to receive real-time change notifications.'
})
  .input(
    z.object({
      action: z
        .string()
        .describe('The action performed (e.g., "updateOn", "createFlag", "deleteFlag")'),
      kind: z
        .string()
        .describe('Resource kind (e.g., "flag", "project", "environment", "segment")'),
      resourceName: z.string().describe('Name of the affected resource'),
      resourceKey: z.string().optional().describe('Key of the affected resource'),
      projectKey: z.string().optional().describe('Project key if applicable'),
      environmentKey: z.string().optional().describe('Environment key if applicable'),
      description: z.string().describe('Human-readable description of the change'),
      memberEmail: z.string().optional().describe('Email of the member who made the change'),
      memberName: z.string().optional().describe('Name of the member who made the change'),
      date: z.string().describe('Timestamp of the change (ms since epoch)'),
      auditLogEntryId: z.string().describe('Audit log entry ID for deduplication')
    })
  )
  .output(
    z.object({
      action: z.string().describe('The action performed'),
      kind: z.string().describe('Resource kind'),
      resourceName: z.string().describe('Name of the affected resource'),
      resourceKey: z.string().optional().describe('Key of the affected resource'),
      projectKey: z.string().optional().describe('Project key'),
      environmentKey: z.string().optional().describe('Environment key'),
      description: z.string().describe('Human-readable description of the change'),
      memberEmail: z.string().optional().describe('Email of the member who made the change'),
      memberName: z.string().optional().describe('Name of the member'),
      date: z.string().describe('Timestamp of the change')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new LaunchDarklyClient(ctx.auth.token, ctx.auth.baseUrl);

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        name: 'LaunchDarkly change notifications',
        sign: true,
        on: true,
        statements: [
          {
            effect: 'allow',
            actions: ['*'],
            resources: [
              'proj/*:env/*:flag/*',
              'proj/*',
              'proj/*:env/*',
              'proj/*:env/*:segment/*',
              'member/*'
            ]
          }
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook._id,
          secret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new LaunchDarklyClient(ctx.auth.token, ctx.auth.baseUrl);
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let rawBody = await ctx.request.text();
      let registrationDetails = ctx.registrationDetails as { secret?: string } | undefined;
      let signature = ctx.request.headers.get('x-ld-signature');

      if (
        !registrationDetails?.secret ||
        !signature ||
        !verifyHmacSignature({
          secret: registrationDetails.secret,
          payload: rawBody,
          signature: signature.trim(),
          digest: 'hex'
        })
      ) {
        return {
          inputs: [],
          response: new Response('Invalid signature', { status: 401 })
        };
      }

      let data: any;
      try {
        data = JSON.parse(rawBody);
      } catch {
        return { inputs: [] };
      }

      if (!data?._id) {
        return { inputs: [] };
      }

      let kind = data.kind ?? 'unknown';
      let action = data.titleVerb ?? data.name ?? 'changed';

      let { projectKey, environmentKey, flagKey, segmentKey, memberId } =
        parseResourceSpecifiers(data.target?.resources);
      let resourceKey = flagKey ?? segmentKey ?? memberId ?? environmentKey ?? projectKey;

      return {
        inputs: [
          {
            action,
            kind,
            resourceName: data.name ?? '',
            resourceKey,
            projectKey,
            environmentKey,
            description: data.description ?? data.shortDescription ?? '',
            memberEmail: data.member?.email,
            memberName: data.member?.firstName
              ? `${data.member.firstName} ${data.member.lastName ?? ''}`.trim()
              : undefined,
            date: String(data.date),
            auditLogEntryId: data._id
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventKind = ctx.input.kind.toLowerCase().replace(/\s+/g, '_');
      let eventAction = ctx.input.action.toLowerCase().replace(/\s+/g, '_');

      return {
        type: `${eventKind}.${eventAction}`,
        id: ctx.input.auditLogEntryId,
        output: {
          action: ctx.input.action,
          kind: ctx.input.kind,
          resourceName: ctx.input.resourceName,
          resourceKey: ctx.input.resourceKey,
          projectKey: ctx.input.projectKey,
          environmentKey: ctx.input.environmentKey,
          description: ctx.input.description,
          memberEmail: ctx.input.memberEmail,
          memberName: ctx.input.memberName,
          date: ctx.input.date
        }
      };
    }
  })
  .build();
