import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let commentEventsTrigger = SlateTrigger.create(spec, {
  name: 'Comment Events',
  key: 'comment_events',
  description:
    'Triggered when comments are added, updated, or deleted on issues in a Leiga project.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Event type (e.g. Comment.Add, Comment.Update, Comment.Delete)'),
      eventTimestamp: z.number().describe('Event timestamp'),
      commentData: z.any().describe('Full comment payload'),
      issueData: z.any().optional().describe('Parent issue data'),
      triggerUser: z.any().optional().describe('User who triggered the event'),
      tenantId: z.number().optional().describe('Tenant ID')
    })
  )
  .output(
    z.object({
      commentId: z.number().optional().describe('Comment ID'),
      commentContent: z.string().optional().describe('Comment content'),
      commentType: z.string().optional().describe('Comment type (comment or reply)'),
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

        let commentEventIds = events
          .filter((e: any) => e.typeCode === 'comment')
          .map((e: any) => e.eventId);

        if (commentEventIds.length === 0) continue;

        let webhookResponse = await client.createWebhook({
          name: `Slates - Comment Events (${project.pkey})`,
          state: 'enabled',
          type: 'ligaAI',
          projectId: project.id,
          eventIds: commentEventIds,
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
            eventType: data.type || 'Comment.Unknown',
            eventTimestamp: data.date || Date.now(),
            commentData: data.data?.comment || data.data,
            issueData: data.data?.issue,
            triggerUser: data.trigger?.user,
            tenantId: data.tenant?.id
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let comment = ctx.input.commentData;
      let issue = ctx.input.issueData;
      let eventType = ctx.input.eventType;

      let typeMap: Record<string, string> = {
        'Comment.Add': 'comment.added',
        'Comment.Update': 'comment.updated',
        'Comment.Delete': 'comment.deleted'
      };

      return {
        type:
          typeMap[eventType] || `comment.${eventType.toLowerCase().replace('comment.', '')}`,
        id: `comment-${comment?.id || 'unknown'}-${ctx.input.eventTimestamp}`,
        output: {
          commentId: comment?.id,
          commentContent: comment?.content,
          commentType: comment?.type,
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
