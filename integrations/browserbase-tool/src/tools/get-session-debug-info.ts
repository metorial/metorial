import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSessionDebugInfo = SlateTool.create(spec, {
  name: 'Get Session Debug Info',
  key: 'get_session_debug_info',
  description: `Retrieve live debugging URLs and page information for a running session. Returns debugger URLs, WebSocket URL, and details about currently open pages. Use this to inspect or connect to a live session.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('The session ID to get debug info for')
    })
  )
  .output(
    z.object({
      debuggerFullscreenUrl: z.string().describe('Full-screen debugger URL'),
      debuggerUrl: z.string().describe('Standard debugger URL'),
      wsUrl: z.string().describe('WebSocket connection URL'),
      pages: z
        .array(
          z.object({
            pageId: z.string().describe('Page identifier'),
            url: z.string().describe('Current page URL'),
            faviconUrl: z.string().describe('Page favicon URL'),
            title: z.string().describe('Page title'),
            debuggerUrl: z.string().describe('Page-level debugger URL'),
            debuggerFullscreenUrl: z.string().describe('Page-level fullscreen debugger URL')
          })
        )
        .describe('Open pages in the session')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let debug = await client.getSessionDebugUrls(ctx.input.sessionId);

    return {
      output: {
        debuggerFullscreenUrl: debug.debuggerFullscreenUrl,
        debuggerUrl: debug.debuggerUrl,
        wsUrl: debug.wsUrl,
        pages: debug.pages.map(p => ({
          pageId: p.id,
          url: p.url,
          faviconUrl: p.faviconUrl,
          title: p.title,
          debuggerUrl: p.debuggerUrl,
          debuggerFullscreenUrl: p.debuggerFullscreenUrl
        }))
      },
      message: `Retrieved debug info for session **${ctx.input.sessionId}** with **${debug.pages.length}** open page(s).`
    };
  })
  .build();
