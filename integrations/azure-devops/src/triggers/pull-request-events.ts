import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AzureDevOpsClient } from '../lib/client';
import { spec } from '../spec';

export let pullRequestEventsTrigger = SlateTrigger.create(spec, {
  name: 'Pull Request Events',
  key: 'pull_request_events',
  description:
    'Fires when pull requests are created, updated, merge-attempted, or commented on.'
})
  .input(
    z.object({
      eventType: z.string().describe('Azure DevOps event type'),
      resourceId: z.string().describe('Unique event resource identifier'),
      resource: z.any().describe('Event resource payload')
    })
  )
  .output(
    z.object({
      pullRequestId: z.number(),
      repositoryId: z.string().optional(),
      repositoryName: z.string().optional(),
      projectName: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      sourceRefName: z.string().optional(),
      targetRefName: z.string().optional(),
      createdBy: z.string().optional(),
      creationDate: z.string().optional(),
      mergeStatus: z.string().optional(),
      isDraft: z.boolean().optional(),
      reviewers: z
        .array(
          z.object({
            reviewerId: z.string().optional(),
            displayName: z.string().optional(),
            vote: z.number().optional()
          })
        )
        .optional(),
      url: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AzureDevOpsClient({
        token: ctx.auth.token,
        organization: ctx.config.organization
      });

      let eventTypes = [
        'git.pullrequest.created',
        'git.pullrequest.updated',
        'git.pullrequest.merged',
        'ms.vss-code.git-pullrequest-comment-event'
      ];

      let subscriptionIds: string[] = [];

      for (let eventType of eventTypes) {
        let publisherInputs: Record<string, string> = {};
        if (ctx.config.project) {
          publisherInputs.projectId = ctx.config.project;
        }

        let sub = await client.createServiceHookSubscription({
          publisherId: 'tfs',
          eventType,
          consumerId: 'webHooks',
          consumerActionId: 'httpRequest',
          publisherInputs,
          consumerInputs: {
            url: ctx.input.webhookBaseUrl
          },
          resourceVersion: '1.0'
        });
        subscriptionIds.push(sub.id);
      }

      return {
        registrationDetails: { subscriptionIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new AzureDevOpsClient({
        token: ctx.auth.token,
        organization: ctx.config.organization
      });

      let details = ctx.input.registrationDetails as { subscriptionIds: string[] };
      for (let id of details.subscriptionIds) {
        try {
          await client.deleteServiceHookSubscription(id);
        } catch {
          // Subscription may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let resource = data.resource || {};

      return {
        inputs: [
          {
            eventType: data.eventType || '',
            resourceId: data.id || resource.pullRequestId?.toString() || `pr-${Date.now()}`,
            resource
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let resource = ctx.input.resource || {};
      let repo = resource.repository || {};

      let eventType = ctx.input.eventType;
      let type = 'pull_request.updated';
      if (eventType.includes('created')) type = 'pull_request.created';
      else if (eventType.includes('merged')) type = 'pull_request.merged';
      else if (eventType.includes('comment')) type = 'pull_request.commented';

      return {
        type,
        id: ctx.input.resourceId,
        output: {
          pullRequestId: resource.pullRequestId,
          repositoryId: repo.id,
          repositoryName: repo.name,
          projectName: repo.project?.name,
          title: resource.title,
          description: resource.description,
          status: resource.status,
          sourceRefName: resource.sourceRefName,
          targetRefName: resource.targetRefName,
          createdBy: resource.createdBy?.displayName,
          creationDate: resource.creationDate,
          mergeStatus: resource.mergeStatus,
          isDraft: resource.isDraft,
          reviewers: (resource.reviewers || []).map((r: any) => ({
            reviewerId: r.id,
            displayName: r.displayName,
            vote: r.vote
          })),
          url: resource._links?.web?.href || resource.url
        }
      };
    }
  })
  .build();
