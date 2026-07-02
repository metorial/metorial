import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let repoEventTypes = [
  'repo:push',
  'repo:fork',
  'repo:updated',
  'repo:transfer',
  'repo:commit_comment_created',
  'repo:commit_status_created',
  'repo:commit_status_updated',
  'repo:deleted'
] as const;

export let repositoryEventsTrigger = SlateTrigger.create(spec, {
  name: 'Repository Events',
  key: 'repository_events',
  description:
    'Triggers on repository-level events including pushes, forks, metadata updates, transfers, commit comments, build statuses, and deletions.'
})
  .input(
    z.object({
      eventType: z.string().describe('Bitbucket event type identifier'),
      eventKey: z.string().describe('Unique event key for deduplication'),
      repository: z.any().describe('Repository data from the webhook payload'),
      actor: z.any().optional().describe('Actor who triggered the event'),
      push: z.any().optional().describe('Push data (for repo:push events)'),
      fork: z.any().optional().describe('Fork data (for repo:fork events)'),
      changes: z.any().optional().describe('Changes data (for repo:updated events)'),
      comment: z.any().optional().describe('Comment data (for commit comment events)'),
      commitStatus: z.any().optional().describe('Commit status data')
    })
  )
  .output(
    z.object({
      repoSlug: z.string(),
      repoFullName: z.string(),
      actorDisplayName: z.string().optional(),
      actorUuid: z.string().optional(),
      // Push-specific
      branchName: z.string().optional(),
      commitHash: z.string().optional(),
      commitMessage: z.string().optional(),
      // Fork-specific
      forkFullName: z.string().optional(),
      // Comment-specific
      commentContent: z.string().optional(),
      commentId: z.number().optional(),
      // Commit status-specific
      statusState: z.string().optional(),
      statusKey: z.string().optional(),
      statusName: z.string().optional(),
      statusUrl: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

      // Register a workspace-level webhook for all repository events
      let webhook = await client.createWorkspaceWebhook({
        description: 'Slates - Repository Events',
        url: ctx.input.webhookBaseUrl,
        active: true,
        events: [...repoEventTypes]
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

      let eventKey = `${hookUuid}-${eventHeader}-${Date.now()}`;

      // For push events, create an input per change
      if (eventHeader === 'repo:push' && data.push?.changes?.length) {
        return {
          inputs: data.push.changes.map((change: any, idx: number) => ({
            eventType: eventHeader,
            eventKey: `${eventKey}-${idx}`,
            repository: data.repository,
            actor: data.actor,
            push: change
          }))
        };
      }

      return {
        inputs: [
          {
            eventType: eventHeader,
            eventKey,
            repository: data.repository,
            actor: data.actor,
            push: data.push,
            fork: data.fork,
            changes: data.changes,
            comment: data.comment,
            commitStatus: data.commit_status
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, repository, actor, push, fork, comment, commitStatus } = ctx.input;

      let output: Record<string, any> = {
        repoSlug: repository?.slug || '',
        repoFullName: repository?.full_name || '',
        actorDisplayName: actor?.display_name || undefined,
        actorUuid: actor?.uuid || undefined
      };

      // Push-specific
      if (eventType === 'repo:push' && push) {
        let newTarget = push.new || push.old;
        output.branchName = newTarget?.name || undefined;
        output.commitHash = newTarget?.target?.hash || push.commits?.[0]?.hash || undefined;
        output.commitMessage =
          newTarget?.target?.message || push.commits?.[0]?.message || undefined;
      }

      // Fork-specific
      if (eventType === 'repo:fork' && fork) {
        output.forkFullName = fork.full_name || undefined;
      }

      // Comment-specific
      if (comment) {
        output.commentContent = comment.content?.raw || undefined;
        output.commentId = comment.id;
      }

      // Commit status-specific
      if (commitStatus) {
        output.statusState = commitStatus.state || undefined;
        output.statusKey = commitStatus.key || undefined;
        output.statusName = commitStatus.name || undefined;
        output.statusUrl = commitStatus.url || undefined;
      }

      // Map event types to cleaner format
      let typeMap: Record<string, string> = {
        'repo:push': 'repository.push',
        'repo:fork': 'repository.fork',
        'repo:updated': 'repository.updated',
        'repo:transfer': 'repository.transfer',
        'repo:commit_comment_created': 'repository.commit_comment_created',
        'repo:commit_status_created': 'repository.commit_status_created',
        'repo:commit_status_updated': 'repository.commit_status_updated',
        'repo:deleted': 'repository.deleted'
      };

      return {
        type: typeMap[eventType] || eventType,
        id: ctx.input.eventKey,
        output: output as any
      };
    }
  })
  .build();
