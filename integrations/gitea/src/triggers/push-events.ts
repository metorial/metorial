import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let pushEvents = SlateTrigger.create(spec, {
  name: 'Push Events',
  key: 'push_events',
  description:
    'Triggers when commits are pushed to a repository, including information about the branch, commits, and pusher.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type from webhook'),
      ref: z.string().describe('Git ref that was pushed to'),
      before: z.string().describe('SHA of the previous head commit'),
      after: z.string().describe('SHA of the new head commit'),
      compareUrl: z.string().describe('URL to compare the changes'),
      pusherLogin: z.string().describe('Username of the pusher'),
      repositoryFullName: z.string().describe('Full repository name (owner/repo)'),
      repositoryOwner: z.string().describe('Repository owner'),
      repositoryName: z.string().describe('Repository name'),
      commits: z
        .array(
          z.object({
            sha: z.string().describe('Commit SHA'),
            message: z.string().describe('Commit message'),
            authorName: z.string().describe('Commit author name'),
            authorEmail: z.string().describe('Commit author email'),
            timestamp: z.string().describe('Commit timestamp'),
            url: z.string().describe('Commit URL')
          })
        )
        .describe('Commits pushed')
    })
  )
  .output(
    z.object({
      ref: z.string().describe('Git ref that was pushed to (e.g., refs/heads/main)'),
      branch: z.string().describe('Branch name extracted from the ref'),
      before: z.string().describe('Previous head commit SHA'),
      after: z.string().describe('New head commit SHA'),
      compareUrl: z.string().describe('URL to compare changes'),
      pusherLogin: z.string().describe('Username of the pusher'),
      repositoryFullName: z.string().describe('Full repository name'),
      repositoryOwner: z.string().describe('Repository owner'),
      repositoryName: z.string().describe('Repository name'),
      commitCount: z.number().describe('Number of commits pushed'),
      commits: z
        .array(
          z.object({
            sha: z.string().describe('Commit SHA'),
            message: z.string().describe('Commit message'),
            authorName: z.string().describe('Author name'),
            authorEmail: z.string().describe('Author email'),
            timestamp: z.string().describe('Commit timestamp'),
            url: z.string().describe('Web URL of the commit')
          })
        )
        .describe('Commits included in the push')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let eventType = ctx.request.headers.get('X-Gitea-Event') || '';

      if (eventType !== 'push') {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as Record<string, any>;

      let commits = ((data.commits || []) as Record<string, any>[]).map(
        (c: Record<string, any>) => ({
          sha: String(c.id || ''),
          message: String(c.message || ''),
          authorName: String(c.author?.name || ''),
          authorEmail: String(c.author?.email || ''),
          timestamp: String(c.timestamp || ''),
          url: String(c.url || '')
        })
      );

      return {
        inputs: [
          {
            eventType,
            ref: String(data.ref || ''),
            before: String(data.before || ''),
            after: String(data.after || ''),
            compareUrl: String(data.compare_url || ''),
            pusherLogin: String(data.pusher?.login || data.sender?.login || ''),
            repositoryFullName: String(data.repository?.full_name || ''),
            repositoryOwner: String(data.repository?.owner?.login || ''),
            repositoryName: String(data.repository?.name || ''),
            commits
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let ref = ctx.input.ref;
      let branch = ref.replace(/^refs\/heads\//, '');

      return {
        type: 'push',
        id: `push-${ctx.input.after}-${ctx.input.repositoryFullName}`,
        output: {
          ref,
          branch,
          before: ctx.input.before,
          after: ctx.input.after,
          compareUrl: ctx.input.compareUrl,
          pusherLogin: ctx.input.pusherLogin,
          repositoryFullName: ctx.input.repositoryFullName,
          repositoryOwner: ctx.input.repositoryOwner,
          repositoryName: ctx.input.repositoryName,
          commitCount: ctx.input.commits.length,
          commits: ctx.input.commits
        }
      };
    }
  })
  .build();
