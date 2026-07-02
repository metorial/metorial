import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let attachmentEventsTrigger = SlateTrigger.create(spec, {
  name: 'Attachment Events',
  key: 'attachment_events',
  description:
    'Triggered when attachments are uploaded to or deleted from issues in a Leiga project.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type (e.g. Attachment.Upload, Attachment.Delete)'),
      eventTimestamp: z.number().describe('Event timestamp'),
      attachmentData: z.any().describe('Full attachment payload'),
      issueData: z.any().optional().describe('Parent issue data'),
      triggerUser: z.any().optional().describe('User who triggered the event'),
      tenantId: z.number().optional().describe('Tenant ID')
    })
  )
  .output(
    z.object({
      attachmentName: z.string().optional().describe('Attachment file name'),
      attachmentExtension: z.string().optional().describe('File extension'),
      issueId: z.number().optional().describe('Parent issue ID'),
      issueSummary: z.string().optional().describe('Parent issue summary'),
      projectId: z.number().optional().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      triggeredByName: z.string().optional().describe('User who triggered the event'),
      triggeredByEmail: z.string().optional().describe('Email of user who triggered the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let projects = await client.listProjects();
      let registrations: Array<{ projectId: number; webhookId: number }> = [];

      for (let project of projects.data || []) {
        let eventsResponse = await client.listWebhookEvents(project.id);
        let events = eventsResponse.data || [];

        let attachmentEventIds = events
          .filter((e: any) => e.typeCode === 'attachment')
          .map((e: any) => e.eventId);

        if (attachmentEventIds.length === 0) continue;

        let webhookResponse = await client.createWebhook({
          name: `Slates - Attachment Events (${project.pkey})`,
          state: 'enabled',
          type: 'ligaAI',
          projectId: project.id,
          eventIds: attachmentEventIds,
          url: ctx.input.webhookBaseUrl
        });

        if (webhookResponse.data?.webhookId) {
          registrations.push({
            projectId: project.id,
            webhookId: webhookResponse.data.webhookId
          });
        }
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations = (ctx.input.registrationDetails as any)?.registrations || [];

      for (let reg of registrations) {
        try {
          await client.deleteWebhook(reg.webhookId);
        } catch {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.type || 'Attachment.Unknown',
            eventTimestamp: data.date || Date.now(),
            attachmentData: data.data?.attachment || data.data,
            issueData: data.data?.issue,
            triggerUser: data.trigger?.user,
            tenantId: data.tenant?.id
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let attachment = ctx.input.attachmentData;
      let issue = ctx.input.issueData;
      let eventType = ctx.input.eventType;

      let typeMap: Record<string, string> = {
        'Attachment.Upload': 'attachment.uploaded',
        'Attachment.Delete': 'attachment.deleted'
      };

      return {
        type:
          typeMap[eventType] ||
          `attachment.${eventType.toLowerCase().replace('attachment.', '')}`,
        id: `attachment-${attachment?.name || 'unknown'}-${ctx.input.eventTimestamp}`,
        output: {
          attachmentName: attachment?.name,
          attachmentExtension: attachment?.extension,
          issueId: issue?.id,
          issueSummary: issue?.summary,
          projectId: issue?.project?.id,
          projectName: issue?.project?.name,
          triggeredByName: ctx.input.triggerUser?.name,
          triggeredByEmail: ctx.input.triggerUser?.email
        }
      };
    }
  })
  .build();
