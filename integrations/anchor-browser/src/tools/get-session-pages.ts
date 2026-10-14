import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSessionPages = SlateTool.create(spec, {
  name: 'Get Session Pages',
  key: 'get_session_pages',
  description:
    'List the open pages in a browser session, including each page ID, title, URL, and live view URL.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      sessionId: z.string().describe('Session ID returned by create_session or list_sessions')
    })
  )
  .output(
    z.object({
      count: z.number(),
      pages: z.array(
        z.object({
          pageId: z.string(),
          title: z.string(),
          url: z.string(),
          liveViewUrl: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getSessionPages(
      ctx.input.sessionId
    );
    return {
      output: {
        count: result.count,
        pages: result.items.map(page => ({
          pageId: page.id,
          title: page.title,
          url: page.url,
          liveViewUrl: page.frontend_url
        }))
      },
      message: `Found **${result.count}** pages in session **${ctx.input.sessionId}**.`
    };
  })
  .build();
