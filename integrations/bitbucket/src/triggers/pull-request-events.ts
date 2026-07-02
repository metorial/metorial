import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let prEventTypes = [
  'pullrequest:created',
  'pullrequest:updated',
  'pullrequest:approved',
  'pullrequest:unapproved',
  'pullrequest:changes_request_created',
  'pullrequest:changes_request_removed',
  'pullrequest:fulfilled',
  'pullrequest:rejected',
  'pullrequest:comment_created',
  'pullrequest:comment_updated',
  'pullrequest:comment_deleted',
  'pullrequest:comment_resolved',
  'pullrequest:comment_reopened'
] as const;

export let pullRequestEventsTrigger = SlateTrigger.create(spec, {
  name: 'Pull Request Events',
  key: 'pull_request_events',
  description:
    'Triggers on pull request activity including creation, updates, approvals, merges, declines, change requests, and comments.'
})
  .input(
    z.object({
      eventType: z.string().describe('Bitbucket event type identifier'),
      eventKey: z.string().describe('Unique event key for deduplication'),
      pullRequest: z.any().describe('Pull request data from the webhook payload'),
      repository: z.any().describe('Repository data from the webhook payload'),
      actor: z.any().optional().describe('Actor who triggered the event'),
      comment: z.any().optional().describe('Comment data (for comment events)'),
      approval: z.any().optional().describe('Approval data (for approval events)')
    })
  )
  .output(
    z.object({
      pullRequestId: z.number(),
      title: z.string(),
      state: z.string().optional(),
      repoSlug: z.string(),
      repoFullName: z.string(),
      sourceBranch: z.string().optional(),
      destinationBranch: z.string().optional(),
      authorDisplayName: z.string().optional(),
      actorDisplayName: z.string().optional(),
      actorUuid: z.string().optional(),
      htmlUrl: z.string().optional(),
      // Comment-specific
      commentId: z.number().optional(),
      commentContent: z.string().optional(),
      // Approval-specific
      approverDisplayName: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

      let webhook = await client.createWorkspaceWebhook({
        description: 'Slates - Pull Request Events',
        url: ctx.input.webhookBaseUrl,
        active: true,
        events: [...prEventTypes]
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

      let eventKey = `${hookUuid}-${eventHeader}-${data.pullrequest?.id || ''}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType: eventHeader,
            eventKey,
            pullRequest: data.pullrequest,
            repository: data.repository,
            actor: data.actor,
            comment: data.comment,
            approval: data.approval
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, pullRequest, repository, actor, comment, approval } = ctx.input;

      let output: Record<string, any> = {
        pullRequestId: pullRequest?.id || 0,
        title: pullRequest?.title || '',
        state: pullRequest?.state || undefined,
        repoSlug: repository?.slug || '',
        repoFullName: repository?.full_name || '',
        sourceBranch: pullRequest?.source?.branch?.name || undefined,
        destinationBranch: pullRequest?.destination?.branch?.name || undefined,
        authorDisplayName: pullRequest?.author?.display_name || undefined,
        actorDisplayName: actor?.display_name || undefined,
        actorUuid: actor?.uuid || undefined,
        htmlUrl: pullRequest?.links?.html?.href || undefined
      };

      if (comment) {
        output.commentId = comment.id;
        output.commentContent = comment.content?.raw || undefined;
      }

      if (approval) {
        output.approverDisplayName =
          approval.user?.display_name || actor?.display_name || undefined;
      }

      let typeMap: Record<string, string> = {
        'pullrequest:created': 'pull_request.created',
        'pullrequest:updated': 'pull_request.updated',
        'pullrequest:approved': 'pull_request.approved',
        'pullrequest:unapproved': 'pull_request.unapproved',
        'pullrequest:changes_request_created': 'pull_request.changes_requested',
        'pullrequest:changes_request_removed': 'pull_request.changes_request_removed',
        'pullrequest:fulfilled': 'pull_request.merged',
        'pullrequest:rejected': 'pull_request.declined',
        'pullrequest:comment_created': 'pull_request.comment_created',
        'pullrequest:comment_updated': 'pull_request.comment_updated',
        'pullrequest:comment_deleted': 'pull_request.comment_deleted',
        'pullrequest:comment_resolved': 'pull_request.comment_resolved',
        'pullrequest:comment_reopened': 'pull_request.comment_reopened'
      };

      return {
        type: typeMap[eventType] || eventType,
        id: ctx.input.eventKey,
        output: output as any
      };
    }
  })
  .build();
