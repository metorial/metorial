import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { gitLabServiceError } from '../lib/errors';
import { spec } from '../spec';

export let pushEvents = SlateTrigger.create(spec, {
  name: 'Push Events',
  key: 'push_events',
  description:
    'Triggers when code is pushed to a repository or when tags are created/deleted. Covers both push and tag push events.'
})
  .input(
    z.object({
      eventType: z.enum(['push', 'tag_push']).describe('Type of push event'),
      ref: z.string().describe('Git ref that was pushed to'),
      beforeSha: z.string().describe('SHA before the push'),
      afterSha: z.string().describe('SHA after the push'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().describe('Project name'),
      projectUrl: z.string().describe('Project web URL'),
      userName: z.string().describe('User who pushed'),
      userEmail: z.string().nullable().describe('User email'),
      totalCommitsCount: z.number().describe('Number of commits in the push'),
      commits: z
        .array(
          z.object({
            commitId: z.string().describe('Commit SHA'),
            message: z.string().describe('Commit message'),
            timestamp: z.string().describe('Commit timestamp'),
            authorName: z.string().describe('Commit author name'),
            authorEmail: z.string().describe('Commit author email'),
            url: z.string().describe('URL to the commit'),
            added: z.array(z.string()).describe('Added files'),
            modified: z.array(z.string()).describe('Modified files'),
            removed: z.array(z.string()).describe('Removed files')
          })
        )
        .describe('Commits in the push')
    })
  )
  .output(
    z.object({
      ref: z.string().describe('Git ref (e.g. refs/heads/main)'),
      branchName: z.string().describe('Branch or tag name'),
      beforeSha: z.string().describe('SHA before push'),
      afterSha: z.string().describe('SHA after push'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().describe('Project name'),
      projectUrl: z.string().describe('Project web URL'),
      userName: z.string().describe('User who pushed'),
      totalCommitsCount: z.number().describe('Number of commits'),
      commits: z
        .array(
          z.object({
            commitId: z.string().describe('Commit SHA'),
            message: z.string().describe('Commit message'),
            authorName: z.string().describe('Author name'),
            url: z.string().describe('Commit URL')
          })
        )
        .describe('Commits included in the push')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GitLabClient({
        token: ctx.auth.token,
        instanceUrl: ctx.auth.instanceUrl
      });

      // We need a project ID to register the webhook - extract from config or state
      // The webhook will be registered per-project
      let projectId = (ctx as any).state?.projectId || (ctx as any).config?.projectId;
      if (!projectId) {
        throw gitLabServiceError(
          'A project ID must be configured to register push event webhooks'
        );
      }

      let webhook = await client.createProjectWebhook(projectId, {
        url: ctx.input.webhookBaseUrl,
        pushEvents: true,
        tagPushEvents: true,
        mergeRequestsEvents: false,
        issuesEvents: false,
        noteEvents: false,
        pipelineEvents: false,
        jobEvents: false,
        deploymentEvents: false,
        releasesEvents: false
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          projectId: projectId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new GitLabClient({
        token: ctx.auth.token,
        instanceUrl: ctx.auth.instanceUrl
      });

      let details = ctx.input.registrationDetails as { webhookId: number; projectId: string };
      await client.deleteProjectWebhook(details.projectId, details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventHeader = ctx.request.headers.get('X-Gitlab-Event');

      if (eventHeader !== 'Push Hook' && eventHeader !== 'Tag Push Hook') {
        return { inputs: [] };
      }

      let eventType: 'push' | 'tag_push' =
        eventHeader === 'Tag Push Hook' ? 'tag_push' : 'push';

      let commits = (data.commits || []).map((c: any) => ({
        commitId: c.id,
        message: c.message,
        timestamp: c.timestamp,
        authorName: c.author?.name || '',
        authorEmail: c.author?.email || '',
        url: c.url,
        added: c.added || [],
        modified: c.modified || [],
        removed: c.removed || []
      }));

      return {
        inputs: [
          {
            eventType,
            ref: data.ref || '',
            beforeSha: data.before || '',
            afterSha: data.after || '',
            projectId: data.project?.id || data.project_id || 0,
            projectName: data.project?.name || '',
            projectUrl: data.project?.web_url || '',
            userName: data.user_name || data.user_username || '',
            userEmail: data.user_email || null,
            totalCommitsCount: data.total_commits_count || commits.length,
            commits
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let ref = ctx.input.ref;
      let branchName = ref.replace(/^refs\/(heads|tags)\//, '');

      return {
        type: ctx.input.eventType === 'tag_push' ? 'tag.pushed' : 'push',
        id: `${ctx.input.projectId}_${ctx.input.afterSha}_${ctx.input.ref}`,
        output: {
          ref: ctx.input.ref,
          branchName,
          beforeSha: ctx.input.beforeSha,
          afterSha: ctx.input.afterSha,
          projectId: ctx.input.projectId,
          projectName: ctx.input.projectName,
          projectUrl: ctx.input.projectUrl,
          userName: ctx.input.userName,
          totalCommitsCount: ctx.input.totalCommitsCount,
          commits: ctx.input.commits.map(c => ({
            commitId: c.commitId,
            message: c.message,
            authorName: c.authorName,
            url: c.url
          }))
        }
      };
    }
  })
  .build();
