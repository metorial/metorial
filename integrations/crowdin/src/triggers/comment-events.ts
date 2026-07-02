import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let commentEventsTrigger = SlateTrigger.create(spec, {
  name: 'String Comment Events',
  key: 'comment_events',
  description:
    'Triggered when string comments or issues are created, updated, deleted, or restored in a Crowdin project.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The event type (stringComment.created, stringComment.updated, stringComment.deleted, stringComment.restored)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      projectId: z.string().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      commentId: z.string().optional().describe('Comment ID'),
      commentText: z.string().optional().describe('Comment text'),
      commentType: z.string().optional().describe('Comment type (comment or issue)'),
      issueStatus: z.string().optional().describe('Issue status (if applicable)'),
      stringId: z.string().optional().describe('Source string ID'),
      userId: z.string().optional().describe('User ID'),
      languageId: z.string().optional().describe('Language ID')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      commentId: z.string().optional().describe('Comment ID'),
      commentText: z.string().optional().describe('Comment text'),
      commentType: z.string().optional().describe('Comment type'),
      issueStatus: z.string().optional().describe('Issue status'),
      stringId: z.string().optional().describe('Source string ID'),
      userId: z.string().optional().describe('User ID'),
      languageId: z.string().optional().describe('Language ID')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let projects = await client.listProjects({ limit: 500 });
      let registrations: Array<{ projectId: number; webhookId: number }> = [];

      for (let item of projects.data) {
        let projectId = item.data.id;
        try {
          let webhook = await client.createWebhook(projectId, {
            name: 'Slates Comment Events',
            url: ctx.input.webhookBaseUrl,
            events: [
              'stringComment.created',
              'stringComment.updated',
              'stringComment.deleted',
              'stringComment.restored'
            ],
            requestType: 'POST',
            contentType: 'application/json',
            isActive: true
          });
          registrations.push({ projectId, webhookId: webhook.id });
        } catch (_e) {
          // Skip projects where webhook creation fails
        }
      }

      return { registrationDetails: { registrations } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let registrations = ctx.input.registrationDetails?.registrations || [];

      for (let reg of registrations) {
        try {
          await client.deleteWebhook(reg.projectId, reg.webhookId);
        } catch (_e) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let events = data.events ? data.events : [data];

      let inputs = events
        .filter((evt: any) => evt.event?.startsWith('stringComment.'))
        .map((evt: any) => {
          let projectId = String(evt.project_id || evt.project?.id || '');
          let projectName = evt.project?.name || evt.project || undefined;
          let commentId = String(evt.comment?.id || evt.comment_id || '');

          return {
            eventType: evt.event,
            eventId: `${evt.event}-${projectId}-${commentId}-${Date.now()}`,
            projectId,
            projectName: typeof projectName === 'string' ? projectName : undefined,
            commentId,
            commentText: evt.comment?.text || undefined,
            commentType: evt.comment?.type || undefined,
            issueStatus: evt.comment?.issueStatus || undefined,
            stringId: evt.comment?.stringId
              ? String(evt.comment.stringId)
              : evt.string_id
                ? String(evt.string_id)
                : undefined,
            userId: evt.user_id
              ? String(evt.user_id)
              : evt.comment?.userId
                ? String(evt.comment.userId)
                : undefined,
            languageId: evt.comment?.languageId || evt.language || undefined
          };
        });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          projectId: ctx.input.projectId,
          projectName: ctx.input.projectName,
          commentId: ctx.input.commentId,
          commentText: ctx.input.commentText,
          commentType: ctx.input.commentType,
          issueStatus: ctx.input.issueStatus,
          stringId: ctx.input.stringId,
          userId: ctx.input.userId,
          languageId: ctx.input.languageId
        }
      };
    }
  })
  .build();
