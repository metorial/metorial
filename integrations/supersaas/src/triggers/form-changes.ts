import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let formChangesTrigger = SlateTrigger.create(spec, {
  name: 'Form Changes',
  key: 'form_changes',
  description:
    'Fires when stand-alone forms are submitted or updated. Covers new form submissions, edits, deletions, and restorations. Only applies to stand-alone forms, not forms attached to appointments.'
})
  .input(
    z.object({
      event: z.string().describe('Event type (e.g. new, change, delete, restore)'),
      role: z.string().optional().describe('Role of the actor'),
      formEntryId: z.string().optional().describe('Form entry ID'),
      formTemplateId: z.string().optional().describe('Form template ID'),
      userId: z.string().optional().describe('User ID who submitted the form'),
      content: z.any().optional().describe('Form field values'),
      createdOn: z.string().optional().describe('UTC creation timestamp'),
      updatedOn: z.string().optional().describe('UTC last update timestamp'),
      rawPayload: z.any().optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      formEntryId: z.string().describe('Form entry ID'),
      formTemplateId: z.string().optional().describe('Form template ID'),
      userId: z.string().optional().describe('User ID who submitted the form'),
      content: z.any().optional().describe('Form field values'),
      createdOn: z.string().optional().describe('UTC creation timestamp'),
      updatedOn: z.string().optional().describe('UTC last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth);

      // Register for "Updated stand-alone form" (code: O) which covers all form events
      let formTemplates = await client.listFormTemplates();
      let registrations: Array<{ webhookId: string; parentId: string }> = [];

      for (let form of formTemplates) {
        let formId = String(form.id ?? form[0] ?? '');
        if (!formId) continue;

        let result = await client.createWebhook('O', formId, ctx.input.webhookBaseUrl);
        let webhookId = result?.id ? String(result.id) : '';
        if (webhookId) {
          registrations.push({ webhookId, parentId: formId });
        }
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(ctx.auth);
      let details = ctx.input.registrationDetails as {
        registrations: Array<{ webhookId: string; parentId: string }>;
      };

      if (details?.registrations) {
        for (let reg of details.registrations) {
          try {
            await client.deleteWebhook(reg.webhookId, reg.parentId);
          } catch {
            // Best-effort cleanup
          }
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((item: any) => ({
        event: item.event ?? 'unknown',
        role: item.role != null ? String(item.role) : undefined,
        formEntryId: item.id != null ? String(item.id) : undefined,
        formTemplateId: item.super_form_id != null ? String(item.super_form_id) : undefined,
        userId: item.user_id != null ? String(item.user_id) : undefined,
        content: item.content ?? undefined,
        createdOn: item.created_on ?? undefined,
        updatedOn: item.updated_on ?? undefined,
        rawPayload: item
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.event || 'unknown';
      let formEntryId = ctx.input.formEntryId || `unknown-${Date.now()}`;

      return {
        type: `form.${eventType}`,
        id: `${formEntryId}-${eventType}-${ctx.input.updatedOn || Date.now()}`,
        output: {
          formEntryId,
          formTemplateId: ctx.input.formTemplateId,
          userId: ctx.input.userId,
          content: ctx.input.content,
          createdOn: ctx.input.createdOn,
          updatedOn: ctx.input.updatedOn
        }
      };
    }
  })
  .build();
