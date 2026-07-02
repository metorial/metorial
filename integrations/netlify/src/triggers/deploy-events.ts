import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let deployEvents = SlateTrigger.create(spec, {
  name: 'Deploy Events',
  key: 'deploy_events',
  description:
    'Triggers when deploy events occur on a Netlify site, including deploy started, succeeded, failed, locked, unlocked, and request events.'
})
  .input(
    z.object({
      event: z.string().describe('The deploy event type'),
      deployId: z.string().describe('Unique identifier for the deploy'),
      deploy: z.any().describe('Full deploy payload from Netlify')
    })
  )
  .output(
    z.object({
      deployId: z.string().describe('Unique deploy identifier'),
      siteId: z.string().describe('Site ID this deploy belongs to'),
      siteName: z.string().optional().describe('Site name'),
      state: z.string().optional().describe('Deploy state'),
      url: z.string().optional().describe('Deploy URL'),
      sslUrl: z.string().optional().describe('Deploy SSL URL'),
      branch: z.string().optional().describe('Git branch'),
      commitRef: z.string().optional().describe('Git commit reference'),
      commitUrl: z.string().optional().describe('URL to the commit'),
      title: z.string().optional().describe('Deploy title/message'),
      context: z
        .string()
        .optional()
        .describe('Deploy context (production, deploy-preview, branch-deploy)'),
      createdAt: z.string().optional().describe('Deploy creation timestamp'),
      publishedAt: z.string().optional().describe('Deploy publish timestamp'),
      errorMessage: z.string().optional().describe('Error message if deploy failed'),
      reviewUrl: z.string().optional().describe('Review URL for deploy previews')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let event = 'deploy.unknown';
      let state = data.state || data.status;
      if (state === 'building') event = 'deploy.building';
      else if (state === 'ready') event = 'deploy.succeeded';
      else if (state === 'error') event = 'deploy.failed';
      else if (state === 'locked') event = 'deploy.locked';
      else if (state === 'new') event = 'deploy.created';

      let xNetlifyEvent = ctx.request.headers.get('x-netlify-event');
      if (xNetlifyEvent) {
        event = `deploy.${xNetlifyEvent.replace('deploy_', '')}`;
      }

      return {
        inputs: [
          {
            event,
            deployId: data.id || '',
            deploy: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let deploy = ctx.input.deploy;

      return {
        type: ctx.input.event,
        id: ctx.input.deployId,
        output: {
          deployId: deploy.id || ctx.input.deployId,
          siteId: deploy.site_id || '',
          siteName: deploy.name,
          state: deploy.state,
          url: deploy.deploy_url || deploy.url,
          sslUrl: deploy.deploy_ssl_url || deploy.ssl_url,
          branch: deploy.branch,
          commitRef: deploy.commit_ref,
          commitUrl: deploy.commit_url,
          title: deploy.title,
          context: deploy.context,
          createdAt: deploy.created_at,
          publishedAt: deploy.published_at,
          errorMessage: deploy.error_message,
          reviewUrl: deploy.review_url
        }
      };
    }
  })
  .build();
