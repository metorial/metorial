import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let repositoryEvent = SlateTrigger.create(spec, {
  name: 'Repository Event',
  key: 'repository_event',
  description:
    'Triggers on repository lifecycle events: created, deleted, forked, renamed, and status changed (enabled/disabled).'
})
  .input(
    z.object({
      eventType: z.string().describe('Azure DevOps event type identifier'),
      eventId: z.string().describe('Unique event identifier'),
      action: z
        .enum(['created', 'deleted', 'forked', 'renamed', 'status_changed'])
        .describe('Repository action'),
      repositoryId: z.string().describe('Repository ID'),
      repositoryName: z.string().describe('Repository name'),
      projectId: z.string().describe('Project ID'),
      projectName: z.string().describe('Project name'),
      defaultBranch: z.string().optional().describe('Default branch of the repository'),
      remoteUrl: z.string().optional().describe('Git remote URL')
    })
  )
  .output(
    z.object({
      repositoryId: z.string().describe('Repository ID'),
      repositoryName: z.string().describe('Repository name'),
      projectId: z.string().describe('Project ID'),
      projectName: z.string().describe('Project name'),
      defaultBranch: z.string().optional().describe('Default branch'),
      remoteUrl: z.string().optional().describe('Git remote URL'),
      webUrl: z.string().describe('Web URL to view the repository')
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
        'git.repo.created',
        'git.repo.deleted',
        'git.repo.forked',
        'git.repo.renamed',
        'git.repo.statuschanged'
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

      let actionMap: Record<
        string,
        'created' | 'deleted' | 'forked' | 'renamed' | 'status_changed'
      > = {
        'git.repo.created': 'created',
        'git.repo.deleted': 'deleted',
        'git.repo.forked': 'forked',
        'git.repo.renamed': 'renamed',
        'git.repo.statuschanged': 'status_changed'
      };

      let action = actionMap[eventType];
      if (!action) {
        return { inputs: [] };
      }

      let resource = data.resource ?? {};
      let project = resource.project ?? {};

      return {
        inputs: [
          {
            eventType,
            eventId: data.id ?? `repo-${resource.id ?? Date.now()}-${action}`,
            action,
            repositoryId: resource.id ?? '',
            repositoryName: resource.name ?? '',
            projectId: project.id ?? '',
            projectName: project.name ?? '',
            defaultBranch: resource.defaultBranch,
            remoteUrl: resource.remoteUrl
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let webUrl = `https://dev.azure.com/${ctx.config.organization}/${ctx.input.projectName}/_git/${ctx.input.repositoryName}`;

      return {
        type: `repository.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          repositoryId: ctx.input.repositoryId,
          repositoryName: ctx.input.repositoryName,
          projectId: ctx.input.projectId,
          projectName: ctx.input.projectName,
          defaultBranch: ctx.input.defaultBranch,
          remoteUrl: ctx.input.remoteUrl,
          webUrl
        }
      };
    }
  })
  .build();
