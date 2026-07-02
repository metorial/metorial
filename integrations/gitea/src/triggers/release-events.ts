import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let releaseEvents = SlateTrigger.create(spec, {
  name: 'Release Events',
  key: 'release_events',
  description: 'Triggers when releases are created, updated, or deleted in a repository.'
})
  .input(
    z.object({
      action: z.string().describe('Event action (published, updated, deleted)'),
      releaseId: z.number().describe('Release ID'),
      tagName: z.string().describe('Git tag name'),
      releaseName: z.string().describe('Release title'),
      releaseBody: z.string().describe('Release notes'),
      isDraft: z.boolean().describe('Whether it is a draft'),
      isPrerelease: z.boolean().describe('Whether it is a pre-release'),
      htmlUrl: z.string().describe('Release URL'),
      authorLogin: z.string().describe('Release author'),
      senderLogin: z.string().describe('User who triggered the event'),
      repositoryFullName: z.string().describe('Full repository name'),
      repositoryOwner: z.string().describe('Repository owner'),
      repositoryName: z.string().describe('Repository name')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Event action (published, updated, deleted)'),
      releaseId: z.number().describe('Release ID'),
      tagName: z.string().describe('Git tag name'),
      releaseName: z.string().describe('Release title'),
      releaseBody: z.string().describe('Release notes'),
      isDraft: z.boolean().describe('Whether the release is a draft'),
      isPrerelease: z.boolean().describe('Whether it is a pre-release'),
      htmlUrl: z.string().describe('Web URL of the release'),
      authorLogin: z.string().describe('Release author username'),
      senderLogin: z.string().describe('User who triggered the event'),
      repositoryFullName: z.string().describe('Full repository name'),
      repositoryOwner: z.string().describe('Repository owner'),
      repositoryName: z.string().describe('Repository name')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let eventType = ctx.request.headers.get('X-Gitea-Event') || '';

      if (eventType !== 'release') {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as Record<string, any>;
      let release = data.release as Record<string, any> | undefined;

      if (!release) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            action: String(data.action || 'published'),
            releaseId: Number(release.id),
            tagName: String(release.tag_name || ''),
            releaseName: String(release.name || ''),
            releaseBody: String(release.body || ''),
            isDraft: Boolean(release.draft),
            isPrerelease: Boolean(release.prerelease),
            htmlUrl: String(release.html_url || ''),
            authorLogin: String(release.author?.login || ''),
            senderLogin: String(data.sender?.login || ''),
            repositoryFullName: String(data.repository?.full_name || ''),
            repositoryOwner: String(data.repository?.owner?.login || ''),
            repositoryName: String(data.repository?.name || '')
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `release.${ctx.input.action}`,
        id: `release-${ctx.input.repositoryFullName}-${ctx.input.releaseId}-${ctx.input.action}-${Date.now()}`,
        output: {
          action: ctx.input.action,
          releaseId: ctx.input.releaseId,
          tagName: ctx.input.tagName,
          releaseName: ctx.input.releaseName,
          releaseBody: ctx.input.releaseBody,
          isDraft: ctx.input.isDraft,
          isPrerelease: ctx.input.isPrerelease,
          htmlUrl: ctx.input.htmlUrl,
          authorLogin: ctx.input.authorLogin,
          senderLogin: ctx.input.senderLogin,
          repositoryFullName: ctx.input.repositoryFullName,
          repositoryOwner: ctx.input.repositoryOwner,
          repositoryName: ctx.input.repositoryName
        }
      };
    }
  })
  .build();
