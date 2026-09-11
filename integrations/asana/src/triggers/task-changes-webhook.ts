import { SlateTrigger, verifyHmacSignature } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { asanaServiceError } from '../lib/errors';
import { spec } from '../spec';

function verifyAsanaSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null
): boolean {
  // Asana signs every event delivery once the hook secret is established; a missing
  // signature on a signed hook is a forged request, not a legacy one.
  if (!signatureHeader) return false;
  return verifyHmacSignature({
    secret,
    payload: rawBody,
    signature: signatureHeader.trim(),
    digest: 'hex'
  });
}

export let taskChangesWebhook = SlateTrigger.create(spec, {
  name: 'Task Changes (Webhook)',
  key: 'task_changes_webhook',
  description: 'Temporarily disabled while Asana trigger scoping is redesigned.'
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
      }
    },
    autoRegisterWebhook: async () => {
      throw asanaServiceError('Asana triggers are temporarily disabled.');
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
      let hookSecretHeader = ctx.request.headers.get('x-hook-secret');
      if (hookSecretHeader) {
        return {
          inputs: [],
          response: new Response('', {
            status: 200,
            headers: { 'X-Hook-Secret': hookSecretHeader }
          })
        };
      }

      let rawBody = await ctx.request.text();
      let sig = ctx.request.headers.get('x-hook-signature');
      let registrationDetails = ctx.registrationDetails as { hookSecret?: string } | null;
      let storedSecret = registrationDetails?.hookSecret;
      if (storedSecret && !verifyAsanaSignature(storedSecret, rawBody, sig)) {
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
