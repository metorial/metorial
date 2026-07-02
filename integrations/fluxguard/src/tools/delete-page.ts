import { SlateTool } from 'slates';
import { z } from 'zod';
import { FluxguardClient } from '../lib/client';
import { spec } from '../spec';

export let deletePage = SlateTool.create(spec, {
  name: 'Delete Page',
  key: 'delete_page',
  description: `Delete a monitored page and all its captured versions. This permanently removes the page and its change history from Fluxguard.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('ID of the site containing the page'),
      sessionId: z.string().describe('ID of the session containing the page'),
      pageId: z.string().describe('ID of the page to delete')
    })
  )
  .output(
    z.object({
      siteId: z.string().describe('ID of the site'),
      sessionId: z.string().describe('ID of the session'),
      pageId: z.string().describe('ID of the deleted page'),
      deleted: z.boolean().describe('Whether the page was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FluxguardClient(ctx.auth.token);

    await client.deletePage(ctx.input.siteId, ctx.input.sessionId, ctx.input.pageId);

    return {
      output: {
        siteId: ctx.input.siteId,
        sessionId: ctx.input.sessionId,
        pageId: ctx.input.pageId,
        deleted: true
      },
      message: `Deleted page \`${ctx.input.pageId}\` and all its captured versions.`
    };
  })
  .build();
