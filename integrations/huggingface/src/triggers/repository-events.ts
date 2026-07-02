import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { HubClient } from '../lib/client';
import { spec } from '../spec';

let webhookInputSchema = z.object({
  eventAction: z.string().describe('Event action (create, update, delete, move)'),
  eventScope: z
    .string()
    .describe('Event scope (repo, repo.content, repo.config, discussion, discussion.comment)'),
  webhookId: z.string().describe('Webhook ID'),
  repoType: z.string().describe('Repository type (model, dataset, space)'),
  repoName: z.string().describe('Full repository name'),
  repoId: z.string().describe('Repository ID'),
  repoPrivate: z.boolean().describe('Whether the repo is private'),
  repoUrl: z.string().optional().describe('Web URL of the repository'),
  headSha: z.string().optional().describe('Head commit SHA'),
  updatedRefs: z
    .array(
      z.object({
        ref: z.string().describe('Reference name'),
        oldSha: z.string().nullable().describe('Previous SHA'),
        newSha: z.string().nullable().describe('New SHA')
      })
    )
    .optional()
    .describe('Updated references (for repo.content events)'),
  updatedConfig: z
    .record(z.string(), z.any())
    .optional()
    .describe('Updated config fields (for repo.config events)'),
  discussionNum: z.number().optional().describe('Discussion number (for discussion events)'),
  discussionTitle: z.string().optional().describe('Discussion title'),
  discussionStatus: z.string().optional().describe('Discussion status'),
  discussionAuthorId: z.string().optional().describe('Discussion author ID'),
  isPullRequest: z.boolean().optional().describe('Whether the discussion is a pull request'),
  commentId: z.string().optional().describe('Comment ID (for comment events)'),
  commentContent: z.string().optional().describe('Comment content'),
  commentAuthorId: z.string().optional().describe('Comment author ID'),
  commentHidden: z.boolean().optional().describe('Whether the comment is hidden')
});

export let repositoryEventsTrigger = SlateTrigger.create(spec, {
  name: 'Repository Events',
  key: 'repository_events',
  description:
    'Triggered when events occur on watched Hugging Face repositories, including content changes, config updates, discussions, and comments.'
})
  .input(webhookInputSchema)
  .output(
    z.object({
      repoName: z.string().describe('Full repository name (owner/repo)'),
      repoType: z.string().describe('Repository type (model, dataset, space)'),
      repoId: z.string().describe('Repository ID'),
      repoUrl: z.string().optional().describe('Web URL of the repository'),
      repoPrivate: z.boolean().describe('Whether the repo is private'),
      eventAction: z.string().describe('Event action (create, update, delete, move)'),
      eventScope: z.string().describe('Event scope'),
      headSha: z.string().optional().describe('Head commit SHA'),
      updatedRefs: z
        .array(
          z.object({
            ref: z.string().describe('Reference name'),
            oldSha: z.string().nullable().describe('Previous SHA'),
            newSha: z.string().nullable().describe('New SHA')
          })
        )
        .optional()
        .describe('Updated references'),
      updatedConfig: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated config fields'),
      discussionNum: z.number().optional().describe('Discussion number'),
      discussionTitle: z.string().optional().describe('Discussion title'),
      discussionStatus: z.string().optional().describe('Discussion status'),
      isPullRequest: z
        .boolean()
        .optional()
        .describe('Whether the discussion is a pull request'),
      commentId: z.string().optional().describe('Comment ID'),
      commentContent: z.string().optional().describe('Comment content'),
      commentHidden: z.boolean().optional().describe('Whether the comment is hidden')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new HubClient({ token: ctx.auth.token });

      // Get the authenticated user info to watch all their repos
      let userInfo = await client.whoami();
      let username = userInfo.name;

      let watched: { type: string; name: string }[] = [{ type: 'user', name: username }];

      // Also watch all user's organizations
      if (userInfo.orgs && Array.isArray(userInfo.orgs)) {
        for (let org of userInfo.orgs) {
          watched.push({ type: 'org', name: org.name });
        }
      }

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        watched,
        domains: ['repo', 'discussion']
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new HubClient({ token: ctx.auth.token });
      await client.deleteWebhook({
        webhookId: ctx.input.registrationDetails.webhookId
      });
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let event = data.event || {};
      let repo = data.repo || {};
      let discussion = data.discussion;
      let comment = data.comment;

      let input: z.infer<typeof webhookInputSchema> = {
        eventAction: event.action || 'update',
        eventScope: event.scope || 'repo',
        webhookId: data.webhook?.id || '',
        repoType: repo.type || 'model',
        repoName: repo.name || '',
        repoId: repo.id || '',
        repoPrivate: repo.private || false,
        repoUrl: repo.url?.web,
        headSha: repo.headSha,
        updatedRefs: data.updatedRefs,
        updatedConfig: data.updatedConfig
      };

      if (discussion) {
        input.discussionNum = discussion.num;
        input.discussionTitle = discussion.title;
        input.discussionStatus = discussion.status;
        input.discussionAuthorId = discussion.author?.id;
        input.isPullRequest = discussion.isPullRequest;
      }

      if (comment) {
        input.commentId = comment.id;
        input.commentContent = comment.content;
        input.commentAuthorId = comment.author?.id;
        input.commentHidden = comment.hidden;
      }

      return {
        inputs: [input]
      };
    },

    handleEvent: async ctx => {
      let scope = ctx.input.eventScope;
      let action = ctx.input.eventAction;
      let eventType = `${scope}.${action}`;

      // Build a unique event ID
      let eventId = `${ctx.input.webhookId}-${ctx.input.repoId}-${scope}-${action}`;
      if (ctx.input.discussionNum !== undefined) {
        eventId += `-disc${ctx.input.discussionNum}`;
      }
      if (ctx.input.commentId) {
        eventId += `-${ctx.input.commentId}`;
      }
      if (ctx.input.headSha) {
        eventId += `-${ctx.input.headSha}`;
      }
      // Add timestamp for uniqueness
      eventId += `-${Date.now()}`;

      return {
        type: eventType,
        id: eventId,
        output: {
          repoName: ctx.input.repoName,
          repoType: ctx.input.repoType,
          repoId: ctx.input.repoId,
          repoUrl: ctx.input.repoUrl,
          repoPrivate: ctx.input.repoPrivate,
          eventAction: ctx.input.eventAction,
          eventScope: ctx.input.eventScope,
          headSha: ctx.input.headSha,
          updatedRefs: ctx.input.updatedRefs,
          updatedConfig: ctx.input.updatedConfig,
          discussionNum: ctx.input.discussionNum,
          discussionTitle: ctx.input.discussionTitle,
          discussionStatus: ctx.input.discussionStatus,
          isPullRequest: ctx.input.isPullRequest,
          commentId: ctx.input.commentId,
          commentContent: ctx.input.commentContent,
          commentHidden: ctx.input.commentHidden
        }
      };
    }
  })
  .build();
