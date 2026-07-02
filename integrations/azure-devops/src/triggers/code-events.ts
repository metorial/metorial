import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AzureDevOpsClient } from '../lib/client';
import { spec } from '../spec';

export let codeEventsTrigger = SlateTrigger.create(spec, {
  name: 'Code Push Events',
  key: 'code_push_events',
  description:
    'Fires when code is pushed to a Git repository. Includes details about the push, commits, and branches affected.'
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
      repositoryId: z.string().optional(),
      repositoryName: z.string().optional(),
      projectName: z.string().optional(),
      pushedBy: z.string().optional(),
      pushDate: z.string().optional(),
      refUpdates: z
        .array(
          z.object({
            refName: z.string().optional(),
            oldObjectId: z.string().optional(),
            newObjectId: z.string().optional()
          })
        )
        .optional(),
      commits: z
        .array(
          z.object({
            commitId: z.string().optional(),
            message: z.string().optional(),
            authorName: z.string().optional(),
            authorDate: z.string().optional()
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

      let publisherInputs: Record<string, string> = {};
      if (ctx.config.project) {
        publisherInputs.projectId = ctx.config.project;
      }

      let sub = await client.createServiceHookSubscription({
        publisherId: 'tfs',
        eventType: 'git.push',
        consumerId: 'webHooks',
        consumerActionId: 'httpRequest',
        publisherInputs,
        consumerInputs: {
          url: ctx.input.webhookBaseUrl
        },
        resourceVersion: '1.0'
      });

      return {
        registrationDetails: { subscriptionId: sub.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new AzureDevOpsClient({
        token: ctx.auth.token,
        organization: ctx.config.organization
      });

      let details = ctx.input.registrationDetails as { subscriptionId: string };
      try {
        await client.deleteServiceHookSubscription(details.subscriptionId);
      } catch {
        // Subscription may already be deleted
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let resource = data.resource || {};

      return {
        inputs: [
          {
            eventType: data.eventType || 'git.push',
            resourceId: data.id || resource.pushId?.toString() || `push-${Date.now()}`,
            resource
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let resource = ctx.input.resource || {};
      let repo = resource.repository || {};

      return {
        type: 'code.pushed',
        id: ctx.input.resourceId,
        output: {
          repositoryId: repo.id,
          repositoryName: repo.name,
          projectName: repo.project?.name,
          pushedBy: resource.pushedBy?.displayName,
          pushDate: resource.date,
          refUpdates: (resource.refUpdates || []).map((r: any) => ({
            refName: r.name,
            oldObjectId: r.oldObjectId,
            newObjectId: r.newObjectId
          })),
          commits: (resource.commits || []).map((c: any) => ({
            commitId: c.commitId,
            message: c.comment,
            authorName: c.author?.name,
            authorDate: c.author?.date
          })),
          url: repo.remoteUrl || resource.url
        }
      };
    }
  })
  .build();
