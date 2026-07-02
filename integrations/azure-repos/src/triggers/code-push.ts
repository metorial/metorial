import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let codePush = SlateTrigger.create(spec, {
  name: 'Code Push',
  key: 'code_push',
  description:
    'Triggers when code is pushed to a Git repository. Provides details about the push, including changed refs, commits, and the pusher.'
})
  .input(
    z.object({
      eventType: z.string().describe('Azure DevOps event type'),
      eventId: z.string().describe('Unique event identifier'),
      pushId: z.number().describe('Push ID'),
      repositoryId: z.string().describe('Repository ID'),
      repositoryName: z.string().describe('Repository name'),
      projectId: z.string().describe('Project ID'),
      projectName: z.string().describe('Project name'),
      pushedByName: z.string().describe('Display name of the person who pushed'),
      pushedById: z.string().describe('User ID of the person who pushed'),
      pushDate: z.string().describe('Push date'),
      refUpdates: z
        .array(
          z.object({
            name: z.string(),
            oldObjectId: z.string(),
            newObjectId: z.string()
          })
        )
        .describe('Ref updates in this push'),
      commits: z
        .array(
          z.object({
            commitId: z.string(),
            authorName: z.string(),
            authorEmail: z.string(),
            message: z.string()
          })
        )
        .describe('Commits included in this push')
    })
  )
  .output(
    z.object({
      pushId: z.number().describe('Push ID'),
      repositoryId: z.string().describe('Repository ID'),
      repositoryName: z.string().describe('Repository name'),
      projectName: z.string().describe('Project name'),
      pushedByName: z.string().describe('Display name of the person who pushed'),
      pushedById: z.string().describe('User ID of the person who pushed'),
      pushDate: z.string().describe('Push date'),
      branch: z.string().optional().describe('Primary branch that was updated'),
      refUpdates: z
        .array(
          z.object({
            name: z.string().describe('Full ref name'),
            oldObjectId: z.string().describe('Previous commit SHA'),
            newObjectId: z.string().describe('New commit SHA')
          })
        )
        .describe('Ref updates'),
      commits: z
        .array(
          z.object({
            commitId: z.string().describe('Commit SHA'),
            authorName: z.string().describe('Author name'),
            authorEmail: z.string().describe('Author email'),
            message: z.string().describe('Commit message')
          })
        )
        .describe('Commits included in this push'),
      commitCount: z.number().describe('Number of commits in this push')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        organization: ctx.config.organization,
        project: ctx.config.project
      });

      let subscription = await client.createServiceHookSubscription({
        publisherId: 'tfs',
        eventType: 'git.push',
        consumerId: 'webHooks',
        consumerActionId: 'httpRequest',
        publisherInputs: {
          projectId: ctx.config.project
        },
        consumerInputs: {
          url: ctx.input.webhookBaseUrl
        }
      });

      return {
        registrationDetails: {
          subscriptionId: subscription.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        organization: ctx.config.organization,
        project: ctx.config.project
      });

      let details = ctx.input.registrationDetails as { subscriptionId: string };
      await client.deleteServiceHookSubscription(details.subscriptionId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (!data.eventType || data.eventType !== 'git.push') {
        return { inputs: [] };
      }

      let resource = data.resource ?? {};
      let repository = resource.repository ?? {};
      let project = repository.project ?? {};
      let pushedBy = resource.pushedBy ?? {};
      let refUpdates = (resource.refUpdates ?? []) as Array<{
        name: string;
        oldObjectId: string;
        newObjectId: string;
      }>;
      let commits = (resource.commits ?? []) as Array<{
        commitId: string;
        author: { name: string; email: string };
        comment: string;
      }>;

      return {
        inputs: [
          {
            eventType: data.eventType,
            eventId: data.id ?? `push-${resource.pushId ?? Date.now()}`,
            pushId: resource.pushId ?? 0,
            repositoryId: repository.id ?? '',
            repositoryName: repository.name ?? '',
            projectId: project.id ?? '',
            projectName: project.name ?? '',
            pushedByName: pushedBy.displayName ?? '',
            pushedById: pushedBy.id ?? '',
            pushDate: resource.date ?? new Date().toISOString(),
            refUpdates: refUpdates.map((r: any) => ({
              name: r.name ?? '',
              oldObjectId: r.oldObjectId ?? '',
              newObjectId: r.newObjectId ?? ''
            })),
            commits: commits.map((c: any) => ({
              commitId: c.commitId ?? '',
              authorName: c.author?.name ?? '',
              authorEmail: c.author?.email ?? '',
              message: c.comment ?? ''
            }))
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let primaryRef = ctx.input.refUpdates[0];
      let branch = primaryRef?.name?.replace('refs/heads/', '');

      return {
        type: 'code.pushed',
        id: ctx.input.eventId,
        output: {
          pushId: ctx.input.pushId,
          repositoryId: ctx.input.repositoryId,
          repositoryName: ctx.input.repositoryName,
          projectName: ctx.input.projectName,
          pushedByName: ctx.input.pushedByName,
          pushedById: ctx.input.pushedById,
          pushDate: ctx.input.pushDate,
          branch,
          refUpdates: ctx.input.refUpdates,
          commits: ctx.input.commits,
          commitCount: ctx.input.commits.length
        }
      };
    }
  })
  .build();
