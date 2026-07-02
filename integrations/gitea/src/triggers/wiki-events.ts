import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let wikiEvents = SlateTrigger.create(spec, {
  name: 'Wiki Events',
  key: 'wiki_events',
  description:
    'Triggers when wiki pages are created, edited, renamed, or deleted in a repository.'
})
  .input(
    z.object({
      action: z.string().describe('Event action (created, edited, renamed, deleted)'),
      pageTitle: z.string().describe('Wiki page title'),
      pageUrl: z.string().describe('Wiki page URL'),
      senderLogin: z.string().describe('User who triggered the event'),
      repositoryFullName: z.string().describe('Full repository name'),
      repositoryOwner: z.string().describe('Repository owner'),
      repositoryName: z.string().describe('Repository name')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Event action (created, edited, renamed, deleted)'),
      pageTitle: z.string().describe('Wiki page title'),
      pageUrl: z.string().describe('Web URL of the wiki page'),
      senderLogin: z.string().describe('User who triggered the event'),
      repositoryFullName: z.string().describe('Full repository name'),
      repositoryOwner: z.string().describe('Repository owner'),
      repositoryName: z.string().describe('Repository name')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let eventType = ctx.request.headers.get('X-Gitea-Event') || '';

      if (eventType !== 'wiki') {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as Record<string, any>;

      return {
        inputs: [
          {
            action: String(data.action || ''),
            pageTitle: String(data.page || data.page_name || ''),
            pageUrl: `${String(data.repository?.html_url || '')}/wiki/${String(data.page || '')}`,
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
        type: `wiki.${ctx.input.action}`,
        id: `wiki-${ctx.input.repositoryFullName}-${ctx.input.pageTitle}-${ctx.input.action}-${Date.now()}`,
        output: {
          action: ctx.input.action,
          pageTitle: ctx.input.pageTitle,
          pageUrl: ctx.input.pageUrl,
          senderLogin: ctx.input.senderLogin,
          repositoryFullName: ctx.input.repositoryFullName,
          repositoryOwner: ctx.input.repositoryOwner,
          repositoryName: ctx.input.repositoryName
        }
      };
    }
  })
  .build();
