import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CrowTerminalClient } from '../lib/client';
import { spec } from '../spec';

export let postStatusChanges = SlateTrigger.create(spec, {
  name: 'Post Status Changes',
  key: 'post_status_changes',
  description:
    'Triggers when a post changes status — e.g., when a queued post is published, a scheduled post begins processing, or a post fails to publish.'
})
  .input(
    z.object({
      postId: z.string().describe('Unique identifier of the post'),
      previousStatus: z
        .string()
        .nullable()
        .describe('Previous status of the post, null if newly seen'),
      currentStatus: z.string().describe('Current status of the post'),
      platform: z.string().describe('Social media platform'),
      text: z.string().describe('Text content of the post'),
      accountId: z.string().describe('Account ID the post belongs to'),
      publishedAt: z.string().nullable().describe('Publish timestamp if published'),
      failureReason: z.string().nullable().describe('Failure reason if applicable'),
      platformPostId: z.string().nullable().describe('Native post ID on the platform'),
      platformPostUrl: z.string().nullable().describe('Direct URL on the platform')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('Unique identifier of the post'),
      platform: z.string().describe('Social media platform'),
      text: z.string().describe('Text content of the post'),
      status: z.string().describe('Current status of the post after the change'),
      previousStatus: z.string().nullable().describe('Status before the change'),
      accountId: z.string().describe('Account ID the post belongs to'),
      publishedAt: z
        .string()
        .nullable()
        .describe('Publish timestamp if the post was published'),
      failureReason: z.string().nullable().describe('Failure reason if the post failed'),
      platformPostId: z.string().nullable().describe('Native post ID on the platform'),
      platformPostUrl: z.string().nullable().describe('Direct URL to the post on the platform')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new CrowTerminalClient({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let knownStatuses: Record<string, string> = ctx.state?.knownStatuses || {};
      let inputs: Array<{
        postId: string;
        previousStatus: string | null;
        currentStatus: string;
        platform: string;
        text: string;
        accountId: string;
        publishedAt: string | null;
        failureReason: string | null;
        platformPostId: string | null;
        platformPostUrl: string | null;
      }> = [];

      // Fetch recent posts across all statuses to detect changes
      let result = await client.listPosts({ limit: 50 });

      let updatedStatuses: Record<string, string> = {};

      for (let post of result.items) {
        let previousStatus = knownStatuses[post.postId] || null;
        updatedStatuses[post.postId] = post.status;

        if (previousStatus !== post.status) {
          inputs.push({
            postId: post.postId,
            previousStatus,
            currentStatus: post.status,
            platform: post.platform,
            text: post.text,
            accountId: post.accountId,
            publishedAt: post.publishedAt,
            failureReason: post.failureReason,
            platformPostId: post.platformPostId,
            platformPostUrl: post.platformPostUrl
          });
        }
      }

      return {
        inputs,
        updatedState: {
          knownStatuses: updatedStatuses
        }
      };
    },

    handleEvent: async ctx => {
      let _statusTransition = ctx.input.previousStatus
        ? `${ctx.input.previousStatus} → ${ctx.input.currentStatus}`
        : ctx.input.currentStatus;

      let eventType = `post.${ctx.input.currentStatus}`;

      return {
        type: eventType,
        id: `${ctx.input.postId}:${ctx.input.currentStatus}`,
        output: {
          postId: ctx.input.postId,
          platform: ctx.input.platform,
          text: ctx.input.text,
          status: ctx.input.currentStatus,
          previousStatus: ctx.input.previousStatus,
          accountId: ctx.input.accountId,
          publishedAt: ctx.input.publishedAt,
          failureReason: ctx.input.failureReason,
          platformPostId: ctx.input.platformPostId,
          platformPostUrl: ctx.input.platformPostUrl
        }
      };
    }
  })
  .build();
