import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let imagePush = SlateTrigger.create(spec, {
  name: 'Image Push',
  key: 'image_push',
  description:
    'Triggers when a Docker image is pushed or a new tag is added to a repository. Requires a webhook to be configured on the repository.'
})
  .input(
    z.object({
      pusher: z.string().describe('Username of the person who pushed the image.'),
      tag: z.string().describe('Tag that was pushed.'),
      pushedAt: z.number().describe('Unix timestamp of when the push occurred.'),
      repositoryName: z.string().describe('Short name of the repository.'),
      repoName: z.string().describe('Full repository name (namespace/name).'),
      namespace: z.string().describe('Namespace of the repository.'),
      description: z.string().describe('Short description of the repository.'),
      fullDescription: z.string().describe('Full markdown description.'),
      isPrivate: z.boolean().describe('Whether the repository is private.'),
      isOfficial: z.boolean().describe('Whether this is an official Docker image.'),
      starCount: z.number().describe('Number of stars on the repository.'),
      repoUrl: z.string().describe('URL of the repository on Docker Hub.'),
      callbackUrl: z.string().describe('Callback URL for acknowledging the webhook.')
    })
  )
  .output(
    z.object({
      pusher: z.string().describe('Username of the person who pushed the image.'),
      tag: z.string().describe('Tag that was pushed.'),
      pushedAt: z.string().describe('ISO timestamp of when the push occurred.'),
      repositoryName: z.string().describe('Short name of the repository.'),
      fullRepositoryName: z.string().describe('Full repository name (namespace/name).'),
      namespace: z.string().describe('Namespace of the repository.'),
      description: z.string().describe('Short description of the repository.'),
      isPrivate: z.boolean().describe('Whether the repository is private.'),
      isOfficial: z.boolean().describe('Whether this is an official Docker image.'),
      starCount: z.number().describe('Number of stars on the repository.'),
      repoUrl: z.string().describe('URL of the repository on Docker Hub.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let namespace = ctx.config.namespace || ctx.auth.username;

      // The webhookBaseUrl does not tell us which repo to register for.
      // We need the user to have a repository configured. We'll store the URL and
      // let the platform handle the registration for each repository.
      // Docker Hub requires per-repository webhook registration, so we need a repo name.
      // We'll register this on the configured namespace's repositories.
      // Since Docker Hub webhooks are per-repo, we need a repository to target.
      // The user should configure this through the platform. We return a placeholder.

      // Note: Docker Hub requires per-repository webhooks. The auto-registration
      // will register on the namespace level. The user may need to configure the repository.
      return {
        registrationDetails: {
          webhookBaseUrl: ctx.input.webhookBaseUrl,
          namespace
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      // If we stored webhook IDs during registration, clean them up
      let details = ctx.input.registrationDetails as {
        webhookId?: number;
        namespace?: string;
        repositoryName?: string;
      };
      if (details.webhookId && details.namespace && details.repositoryName) {
        let client = new Client({ token: ctx.auth.token });
        await client.deleteWebhook(
          details.namespace,
          details.repositoryName,
          details.webhookId
        );
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as {
        callback_url?: string;
        push_data?: {
          pusher?: string;
          tag?: string;
          pushed_at?: number;
          images?: string[];
        };
        repository?: {
          name?: string;
          namespace?: string;
          repo_name?: string;
          description?: string;
          full_description?: string;
          is_private?: boolean;
          is_official?: boolean;
          star_count?: number;
          repo_url?: string;
          status?: string;
          owner?: string;
        };
      };

      let pushData = data.push_data || {};
      let repo = data.repository || {};

      return {
        inputs: [
          {
            pusher: pushData.pusher || '',
            tag: pushData.tag || '',
            pushedAt: pushData.pushed_at || 0,
            repositoryName: repo.name || '',
            repoName: repo.repo_name || '',
            namespace: repo.namespace || '',
            description: repo.description || '',
            fullDescription: repo.full_description || '',
            isPrivate: repo.is_private ?? false,
            isOfficial: repo.is_official ?? false,
            starCount: repo.star_count ?? 0,
            repoUrl: repo.repo_url || '',
            callbackUrl: data.callback_url || ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let pushedAtIso = ctx.input.pushedAt
        ? new Date(ctx.input.pushedAt * 1000).toISOString()
        : new Date().toISOString();

      let eventId = `${ctx.input.repoName}:${ctx.input.tag}:${ctx.input.pushedAt}`;

      return {
        type: 'image.pushed',
        id: eventId,
        output: {
          pusher: ctx.input.pusher,
          tag: ctx.input.tag,
          pushedAt: pushedAtIso,
          repositoryName: ctx.input.repositoryName,
          fullRepositoryName: ctx.input.repoName,
          namespace: ctx.input.namespace,
          description: ctx.input.description,
          isPrivate: ctx.input.isPrivate,
          isOfficial: ctx.input.isOfficial,
          starCount: ctx.input.starCount,
          repoUrl: ctx.input.repoUrl
        }
      };
    }
  })
  .build();
