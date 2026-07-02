import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let releaseTrigger = SlateTrigger.create(spec, {
  name: 'Release',
  key: 'release',
  description:
    'Triggered when a release is published, edited, deleted, prereleased, or released.'
})
  .input(
    z.object({
      action: z
        .string()
        .describe('Release event action (published, edited, deleted, prereleased, released)'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      releaseId: z.number().describe('Release ID'),
      tagName: z.string().describe('Tag name'),
      name: z.string().nullable().describe('Release title'),
      body: z.string().nullable().describe('Release notes'),
      htmlUrl: z.string().describe('URL to the release'),
      draft: z.boolean().describe('Whether the release is a draft'),
      prerelease: z.boolean().describe('Whether it is a pre-release'),
      author: z.string().describe('Release author login'),
      createdAt: z.string().describe('Creation timestamp'),
      publishedAt: z.string().nullable().describe('Publication timestamp'),
      deliveryId: z.string().describe('Webhook delivery ID')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Release event action'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      releaseId: z.number().describe('Release ID'),
      tagName: z.string().describe('Tag name'),
      name: z.string().nullable().describe('Release title'),
      body: z.string().nullable().describe('Release notes'),
      htmlUrl: z.string().describe('URL to the release'),
      draft: z.boolean().describe('Whether the release is a draft'),
      prerelease: z.boolean().describe('Whether it is a pre-release'),
      author: z.string().describe('Release author login'),
      createdAt: z.string().describe('Creation timestamp'),
      publishedAt: z.string().nullable().describe('Publication timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let event = ctx.request.headers.get('x-github-event');
      if (event !== 'release') {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as any;
      let release = data.release;
      let deliveryId = ctx.request.headers.get('x-github-delivery') ?? '';

      return {
        inputs: [
          {
            action: data.action,
            owner: data.repository.owner.login,
            repo: data.repository.name,
            releaseId: release.id,
            tagName: release.tag_name,
            name: release.name,
            body: release.body,
            htmlUrl: release.html_url,
            draft: release.draft,
            prerelease: release.prerelease,
            author: release.author.login,
            createdAt: release.created_at,
            publishedAt: release.published_at,
            deliveryId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `release.${ctx.input.action}`,
        id: ctx.input.deliveryId,
        output: {
          action: ctx.input.action,
          owner: ctx.input.owner,
          repo: ctx.input.repo,
          releaseId: ctx.input.releaseId,
          tagName: ctx.input.tagName,
          name: ctx.input.name,
          body: ctx.input.body,
          htmlUrl: ctx.input.htmlUrl,
          draft: ctx.input.draft,
          prerelease: ctx.input.prerelease,
          author: ctx.input.author,
          createdAt: ctx.input.createdAt,
          publishedAt: ctx.input.publishedAt
        }
      };
    }
  })
  .build();
