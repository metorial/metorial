import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pullRequestEvent = SlateTrigger.create(spec, {
  name: 'Pull Request Event',
  key: 'pull_request_event',
  description:
    'Triggers on pull request lifecycle events: created, updated (status/reviewer/vote changes), merge attempted, and commented.'
})
  .input(
    z.object({
      eventType: z.string().describe('Azure DevOps event type identifier'),
      eventId: z.string().describe('Unique event identifier'),
      action: z
        .enum(['created', 'updated', 'merged', 'commented'])
        .describe('Pull request action'),
      pullRequestId: z.number().describe('Pull request ID'),
      title: z.string().describe('Pull request title'),
      description: z.string().optional().describe('Pull request description'),
      status: z.string().describe('Pull request status'),
      isDraft: z.boolean().optional().describe('Whether this is a draft PR'),
      sourceBranch: z.string().describe('Source branch ref name'),
      targetBranch: z.string().describe('Target branch ref name'),
      createdByName: z.string().describe('PR creator display name'),
      createdById: z.string().describe('PR creator user ID'),
      repositoryId: z.string().describe('Repository ID'),
      repositoryName: z.string().describe('Repository name'),
      projectName: z.string().describe('Project name'),
      mergeStatus: z.string().optional().describe('Merge status (for merge events)'),
      changeType: z.string().optional().describe('Change type for update events'),
      commentContent: z.string().optional().describe('Comment content (for comment events)')
    })
  )
  .output(
    z.object({
      pullRequestId: z.number().describe('Pull request ID'),
      title: z.string().describe('Pull request title'),
      description: z.string().optional().describe('Pull request description'),
      status: z.string().describe('Pull request status'),
      isDraft: z.boolean().optional().describe('Whether this is a draft PR'),
      sourceBranch: z.string().describe('Source branch ref name'),
      targetBranch: z.string().describe('Target branch ref name'),
      createdByName: z.string().describe('PR creator display name'),
      createdById: z.string().describe('PR creator user ID'),
      repositoryId: z.string().describe('Repository ID'),
      repositoryName: z.string().describe('Repository name'),
      projectName: z.string().describe('Project name'),
      mergeStatus: z.string().optional().describe('Merge status'),
      changeType: z.string().optional().describe('Change type for update events'),
      commentContent: z.string().optional().describe('Comment content for comment events'),
      webUrl: z.string().describe('Web URL to view the pull request')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        organization: ctx.config.organization,
        project: ctx.config.project
      });

      let eventTypes = [
        'git.pullrequest.created',
        'git.pullrequest.updated',
        'git.pullrequest.merged',
        'ms.vss-code.git-pullrequest-comment-event'
      ];

      let subscriptionIds: string[] = [];

      for (let eventType of eventTypes) {
        let subscription = await client.createServiceHookSubscription({
          publisherId: 'tfs',
          eventType,
          consumerId: 'webHooks',
          consumerActionId: 'httpRequest',
          publisherInputs: {
            projectId: ctx.config.project
          },
          consumerInputs: {
            url: ctx.input.webhookBaseUrl
          }
        });
        if (subscription.id) {
          subscriptionIds.push(subscription.id);
        }
      }

      return {
        registrationDetails: { subscriptionIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        organization: ctx.config.organization,
        project: ctx.config.project
      });

      let details = ctx.input.registrationDetails as { subscriptionIds: string[] };
      for (let subscriptionId of details.subscriptionIds) {
        await client.deleteServiceHookSubscription(subscriptionId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.eventType as string;
      if (!eventType) {
        return { inputs: [] };
      }

      let action: 'created' | 'updated' | 'merged' | 'commented';
      if (eventType === 'git.pullrequest.created') {
        action = 'created';
      } else if (eventType === 'git.pullrequest.updated') {
        action = 'updated';
      } else if (eventType === 'git.pullrequest.merged') {
        action = 'merged';
      } else if (eventType === 'ms.vss-code.git-pullrequest-comment-event') {
        action = 'commented';
      } else {
        return { inputs: [] };
      }

      let resource = data.resource ?? {};
      let pr = action === 'commented' ? (resource.pullRequest ?? {}) : resource;
      let repository = pr.repository ?? {};
      let project = repository.project ?? {};
      let createdBy = pr.createdBy ?? {};
      let comment = action === 'commented' ? (resource.comment ?? {}) : {};

      return {
        inputs: [
          {
            eventType,
            eventId: data.id ?? `pr-${pr.pullRequestId ?? Date.now()}-${action}`,
            action,
            pullRequestId: pr.pullRequestId ?? 0,
            title: pr.title ?? '',
            description: pr.description,
            status: pr.status ?? '',
            isDraft: pr.isDraft,
            sourceBranch: pr.sourceRefName ?? '',
            targetBranch: pr.targetRefName ?? '',
            createdByName: createdBy.displayName ?? '',
            createdById: createdBy.id ?? '',
            repositoryId: repository.id ?? '',
            repositoryName: repository.name ?? '',
            projectName: project.name ?? '',
            mergeStatus: pr.mergeStatus,
            changeType: data.resource?.notificationType,
            commentContent: comment.content
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let webUrl = `https://dev.azure.com/${ctx.config.organization}/${ctx.input.projectName}/_git/${ctx.input.repositoryName}/pullrequest/${ctx.input.pullRequestId}`;

      return {
        type: `pull_request.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          pullRequestId: ctx.input.pullRequestId,
          title: ctx.input.title,
          description: ctx.input.description,
          status: ctx.input.status,
          isDraft: ctx.input.isDraft,
          sourceBranch: ctx.input.sourceBranch,
          targetBranch: ctx.input.targetBranch,
          createdByName: ctx.input.createdByName,
          createdById: ctx.input.createdById,
          repositoryId: ctx.input.repositoryId,
          repositoryName: ctx.input.repositoryName,
          projectName: ctx.input.projectName,
          mergeStatus: ctx.input.mergeStatus,
          changeType: ctx.input.changeType,
          commentContent: ctx.input.commentContent,
          webUrl
        }
      };
    }
  })
  .build();
