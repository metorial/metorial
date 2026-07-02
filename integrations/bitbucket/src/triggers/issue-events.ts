import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let issueEventTypes = ['issue:created', 'issue:updated', 'issue:comment_created'] as const;

export let issueEventsTrigger = SlateTrigger.create(spec, {
  name: 'Issue Events',
  key: 'issue_events',
  description:
    'Triggers on issue tracker events including issue creation, updates, and new comments.'
})
  .input(
    z.object({
      eventType: z.string().describe('Bitbucket event type identifier'),
      eventKey: z.string().describe('Unique event key for deduplication'),
      issue: z.any().describe('Issue data from the webhook payload'),
      repository: z.any().describe('Repository data from the webhook payload'),
      actor: z.any().optional().describe('Actor who triggered the event'),
      comment: z.any().optional().describe('Comment data (for issue:comment_created events)'),
      changes: z.any().optional().describe('Changes data (for issue:updated events)')
    })
  )
  .output(
    z.object({
      issueId: z.number(),
      title: z.string(),
      status: z.string().optional(),
      priority: z.string().optional(),
      kind: z.string().optional(),
      repoSlug: z.string(),
      repoFullName: z.string(),
      assignee: z.string().optional(),
      reporter: z.string().optional(),
      actorDisplayName: z.string().optional(),
      actorUuid: z.string().optional(),
      htmlUrl: z.string().optional(),
      // Comment-specific
      commentId: z.number().optional(),
      commentContent: z.string().optional(),
      // Update-specific
      changedFields: z.array(z.string()).optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

      let webhook = await client.createWorkspaceWebhook({
        description: 'Slates - Issue Events',
        url: ctx.input.webhookBaseUrl,
        active: true,
        events: [...issueEventTypes]
      });

      return {
        registrationDetails: {
          webhookUuid: webhook.uuid
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });
      await client.deleteWorkspaceWebhook(ctx.input.registrationDetails.webhookUuid);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      let eventHeader = ctx.request.headers.get('x-event-key') || '';
      let hookUuid = ctx.request.headers.get('x-hook-uuid') || '';

      let eventKey = `${hookUuid}-${eventHeader}-${data.issue?.id || ''}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType: eventHeader,
            eventKey,
            issue: data.issue,
            repository: data.repository,
            actor: data.actor,
            comment: data.comment,
            changes: data.changes
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, issue, repository, actor, comment, changes } = ctx.input;

      let output: Record<string, any> = {
        issueId: issue?.id || 0,
        title: issue?.title || '',
        status: issue?.state || undefined,
        priority: issue?.priority || undefined,
        kind: issue?.kind || undefined,
        repoSlug: repository?.slug || '',
        repoFullName: repository?.full_name || '',
        assignee: issue?.assignee?.display_name || undefined,
        reporter: issue?.reporter?.display_name || undefined,
        actorDisplayName: actor?.display_name || undefined,
        actorUuid: actor?.uuid || undefined,
        htmlUrl: issue?.links?.html?.href || undefined
      };

      if (comment) {
        output.commentId = comment.id;
        output.commentContent = comment.content?.raw || undefined;
      }

      if (changes) {
        output.changedFields = Object.keys(changes);
      }

      let typeMap: Record<string, string> = {
        'issue:created': 'issue.created',
        'issue:updated': 'issue.updated',
        'issue:comment_created': 'issue.comment_created'
      };

      return {
        type: typeMap[eventType] || eventType,
        id: ctx.input.eventKey,
        output: output as any
      };
    }
  })
  .build();
