import { createHash } from 'node:crypto';
import {
  decodeWebhookWireBody,
  getWebhookHeaderValues,
  SlateTrigger,
  verifyHmacSignature,
  type WebhookWireRequest
} from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { asanaServiceError } from '../lib/errors';
import { spec } from '../spec';

export let verifyAsanaWebhook = async (ctx: {
  input: { ruleId: string; originalRequest: WebhookWireRequest };
  secrets: Record<string, { value: string } | undefined>;
}) => {
  let request = ctx.input.originalRequest;
  let hookSecrets = getWebhookHeaderValues(request, 'x-hook-secret');
  if (ctx.input.ruleId === 'asana.bootstrap.v1') {
    return hookSecrets.length === 1 && hookSecrets[0]!.length > 0
      ? { status: 'accepted' as const, selection: { scope: 'receiver_trigger' as const } }
      : { status: 'rejected' as const, code: 'credential_missing' as const };
  }
  let storedSecret = ctx.secrets.asana_hook_secret?.value;
  let signatures = getWebhookHeaderValues(request, 'x-hook-signature');
  let body = decodeWebhookWireBody(request.body);
  if (!storedSecret || signatures.length !== 1 || body === null) {
    return { status: 'rejected' as const, code: 'credential_missing' as const };
  }
  if (
    !verifyHmacSignature({
      secret: storedSecret,
      payload: body,
      signature: signatures[0]!.trim(),
      digest: 'hex'
    })
  ) {
    return { status: 'rejected' as const, code: 'credential_invalid' as const };
  }
  return {
    status: 'accepted' as const,
    selection: { scope: 'receiver_trigger' as const },
    authenticatedFields: {
      event_id: createHash('sha256').update(body).digest('hex')
    }
  };
};

export let captureAsanaWebhookBootstrap = async (ctx: {
  input: { registrationVersion: number; originalRequest: WebhookWireRequest };
}) => {
  let hookSecrets = getWebhookHeaderValues(ctx.input.originalRequest, 'x-hook-secret');
  if (hookSecrets.length !== 1 || hookSecrets[0]!.length === 0) {
    return { status: 'rejected' as const, code: 'credential_missing' as const };
  }
  let hookSecret = hookSecrets[0]!;
  return {
    status: 'accepted' as const,
    capturedSecrets: {
      asana_hook_secret: {
        value: hookSecret,
        version: ctx.input.registrationVersion
      }
    },
    response: {
      status: 200,
      headers: [['X-Hook-Secret', hookSecret]] as [string, string][],
      body: { present: true as const, base64: '' }
    }
  };
};

export let taskChangesWebhook = SlateTrigger.create(spec, {
  name: 'Task Changes (Webhook)',
  key: 'task_changes_webhook',
  description:
    'Receives task added, changed, and removed events for the configured Asana project. Registers the callback automatically, completes X-Hook-Secret verification, and verifies X-Hook-Signature for signed deliveries. Complements polling triggers.'
})
  .input(
    z.object({
      taskId: z.string().describe('Task GID from the webhook event'),
      action: z
        .string()
        .describe('Asana action (added, changed, removed, deleted, undeleted, …)'),
      eventCreatedAt: z.string().optional().describe('Event created_at from Asana')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('GID of the task'),
      taskName: z.string().describe('Name of the task'),
      assignee: z.any().nullable().optional().describe('Task assignee'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
      createdAt: z.string().optional().describe('When the task was created'),
      dueOn: z.string().nullable().optional().describe('Task due date'),
      modifiedAt: z.string().optional().describe('When the task was last modified'),
      notes: z.string().optional().describe('Task description'),
      projects: z.array(z.any()).optional().describe('Projects the task belongs to'),
      tags: z.array(z.any()).optional().describe('Tags on the task')
    })
  )
  .webhook({
    http: {
      methods: ['POST'],
      sync: {
        mode: 'match',
        match: [{ hasHeader: 'x-hook-secret' }]
      },
      ingress: {
        kind: 'receiver_route',
        baseline: 'receiver_path_secret',
        verification: {
          mechanism: 'provider',
          baseline: 'receiver_path_secret',
          reason: 'Asana negotiates a generation-bound secret before signed deliveries.',
          allowedSecretRefs: [
            {
              source: 'registration',
              name: 'asana_hook_secret',
              registrationKey: 'hookSecret',
              encoding: 'utf8'
            }
          ],
          rules: [
            {
              id: 'asana.bootstrap.v1',
              phase: 'bootstrap',
              when: {
                methods: ['POST'],
                registrationStatuses: ['registering'],
                matcher: { hasHeader: 'x-hook-secret' }
              },
              verify: {
                type: 'provider',
                verifierId: 'asana.delivery.v1',
                allowedSecretRefs: [],
                allowedBootstrapCaptureRefs: ['asana_hook_secret']
              },
              result: { type: 'sync_only' },
              replay: { kind: 'not_applicable', reason: 'bootstrap_sync_only' }
            },
            {
              id: 'asana.delivery.v1',
              phase: 'delivery',
              when: {
                methods: ['POST'],
                registrationStatuses: ['registered', 'renewing']
              },
              verify: {
                type: 'provider',
                verifierId: 'asana.delivery.v1',
                allowedSecretRefs: ['asana_hook_secret'],
                allowedBootstrapCaptureRefs: []
              },
              result: { type: 'dispatch', scope: 'receiver_trigger' },
              replay: {
                kind: 'enforced',
                deduplicate: {
                  source: 'preset',
                  presetField: 'event_id',
                  ttlSeconds: 604_800,
                  scope: 'request'
                }
              }
            }
          ]
        }
      }
    },
    verifyWebhook: verifyAsanaWebhook,
    captureWebhookBootstrap: captureAsanaWebhookBootstrap,
    autoRegisterWebhook: async ctx => {
      if (!ctx.config.webhookProjectId) {
        throw asanaServiceError(
          'config.webhookProjectId is required to auto-register Asana webhooks (project GID that will receive task events).'
        );
      }

      let client = new Client({ token: ctx.auth.token });
      let { webhook } = await client.createWebhook(
        ctx.config.webhookProjectId,
        ctx.input.webhookBaseUrl,
        [
          { resource_type: 'task', action: 'added' },
          { resource_type: 'task', action: 'changed' },
          { resource_type: 'task', action: 'removed' },
          { resource_type: 'task', action: 'deleted' },
          { resource_type: 'task', action: 'undeleted' }
        ]
      );

      return {
        registrationDetails: {
          webhookGid: webhook.gid
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrationDetails = ctx.input.registrationDetails as
        | { webhookGid?: string }
        | undefined;
      if (!registrationDetails?.webhookGid) return;
      await client.deleteWebhook(registrationDetails.webhookGid);
    },

    handleRequest: async ctx => {
      let rawBody = await ctx.request.text();

      let data: any;
      try {
        data = JSON.parse(rawBody);
      } catch {
        return { inputs: [] };
      }

      let events: any[] = Array.isArray(data.events) ? data.events : [];
      let inputs: Array<{ taskId: string; action: string; eventCreatedAt?: string }> = [];

      for (let ev of events) {
        let res = ev.resource;
        if (!res || res.resource_type !== 'task' || !res.gid) continue;
        inputs.push({
          taskId: res.gid,
          action: String(ev.action ?? 'changed'),
          eventCreatedAt: ev.created_at
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let t: any;
      try {
        t = await client.getTask(ctx.input.taskId);
      } catch {
        return {
          type: `task.${ctx.input.action}`,
          id: `${ctx.input.taskId}-${ctx.input.eventCreatedAt ?? Date.now()}`,
          output: {
            taskId: ctx.input.taskId,
            taskName: '',
            assignee: null,
            completed: false,
            createdAt: '',
            dueOn: null,
            modifiedAt: '',
            notes: '',
            projects: [],
            tags: []
          }
        };
      }

      return {
        type: `task.${ctx.input.action}`,
        id: `${ctx.input.taskId}-${ctx.input.eventCreatedAt ?? t.modified_at ?? Date.now()}`,
        output: {
          taskId: t.gid,
          taskName: t.name ?? '',
          assignee: t.assignee,
          completed: t.completed ?? false,
          createdAt: t.created_at,
          dueOn: t.due_on ?? null,
          modifiedAt: t.modified_at,
          notes: t.notes ?? '',
          projects: t.projects ?? [],
          tags: t.tags ?? []
        }
      };
    }
  })
  .build();
