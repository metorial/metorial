import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { parseMaybeJson } from './shared';

let browserSessionSchema = z.object({
  sessionId: z.string().optional().describe('Browser session ID'),
  status: z.string().optional().describe('Session status'),
  cdpUrl: z.string().optional().describe('CDP WebSocket URL'),
  liveViewUrl: z.string().optional().describe('Read-only live view URL'),
  interactiveLiveViewUrl: z.string().optional().describe('Interactive live view URL'),
  streamWebView: z.boolean().optional().describe('Whether live view streaming is enabled'),
  createdAt: z.string().optional().describe('Session creation timestamp'),
  lastActivity: z.string().optional().describe('Last activity timestamp')
});

let mapSession = (session: any) => ({
  sessionId: session.id ?? session.sessionId,
  status: session.status,
  cdpUrl: session.cdpUrl,
  liveViewUrl: session.liveViewUrl,
  interactiveLiveViewUrl: session.interactiveLiveViewUrl,
  streamWebView: session.streamWebView,
  createdAt: session.createdAt,
  lastActivity: session.lastActivity
});

export let createBrowserSessionTool = SlateTool.create(spec, {
  name: 'Create Browser Session',
  key: 'create_browser_session',
  description: `Create a Firecrawl browser sandbox session for interactive web automation. Returns CDP and live view URLs for connecting to or observing the session.`,
  instructions: [
    'Use this for browser automation tasks that need a persistent session not tied to a scrape.',
    'Delete the browser session when finished to release resources.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      ttl: z.number().optional().describe('Total session time-to-live in seconds'),
      activityTtl: z.number().optional().describe('Inactivity timeout in seconds'),
      streamWebView: z.boolean().optional().describe('Stream a live browser view'),
      profileName: z
        .string()
        .optional()
        .describe('Persistent browser profile name to load/save state'),
      profileSaveChanges: z
        .boolean()
        .optional()
        .describe('Whether profile state should be saved on close')
    })
  )
  .output(browserSessionSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createBrowserSession({
      ttl: ctx.input.ttl,
      activityTtl: ctx.input.activityTtl,
      streamWebView: ctx.input.streamWebView,
      profile: ctx.input.profileName
        ? {
            name: ctx.input.profileName,
            saveChanges: ctx.input.profileSaveChanges
          }
        : undefined
    });

    let session = mapSession(result.session ?? result);

    return {
      output: session,
      message: `Created Firecrawl browser session \`${session.sessionId}\`.`
    };
  });

export let listBrowserSessionsTool = SlateTool.create(spec, {
  name: 'List Browser Sessions',
  key: 'list_browser_sessions',
  description: `List Firecrawl browser sandbox sessions for the authenticated team.`,
  instructions: ['Optionally filter sessions by active or destroyed status.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z.enum(['active', 'destroyed']).optional().describe('Session status filter')
    })
  )
  .output(
    z.object({
      sessions: z.array(browserSessionSchema).describe('Browser sessions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listBrowserSessions(ctx.input.status);
    let sessions = (Array.isArray(result.sessions) ? result.sessions : []).map(mapSession);

    return {
      output: {
        sessions
      },
      message: `Retrieved **${sessions.length}** Firecrawl browser session(s).`
    };
  });

export let executeBrowserCodeTool = SlateTool.create(spec, {
  name: 'Execute Browser Code',
  key: 'execute_browser_code',
  description: `Execute Node, Python, or bash code in an active Firecrawl browser sandbox session.`,
  instructions: [
    'Provide a sessionId from Create Browser Session or List Browser Sessions.',
    'Use language node for JavaScript/Playwright code or bash for agent-browser CLI commands.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('Firecrawl browser session ID'),
      code: z.string().describe('Code to execute in the browser sandbox'),
      language: z.enum(['python', 'node', 'bash']).optional().describe('Execution language'),
      timeout: z.number().optional().describe('Execution timeout in seconds')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether execution completed successfully'),
      stdout: z.string().nullable().optional().describe('Standard output'),
      stderr: z.string().nullable().optional().describe('Standard error'),
      result: z.any().optional().describe('Parsed result if JSON, otherwise raw result'),
      exitCode: z.number().nullable().optional().describe('Process exit code'),
      killed: z.boolean().optional().describe('Whether execution timed out'),
      error: z.string().nullable().optional().describe('Execution error')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.executeBrowserCode(ctx.input.sessionId, {
      code: ctx.input.code,
      language: ctx.input.language,
      timeout: ctx.input.timeout
    });

    return {
      output: {
        success: result.success,
        stdout: result.stdout,
        stderr: result.stderr,
        result: parseMaybeJson(result.result),
        exitCode: result.exitCode,
        killed: result.killed,
        error: result.error
      },
      message: `Executed code in Firecrawl browser session \`${ctx.input.sessionId}\`.`
    };
  });

export let deleteBrowserSessionTool = SlateTool.create(spec, {
  name: 'Delete Browser Session',
  key: 'delete_browser_session',
  description: `Delete a Firecrawl browser sandbox session and release its resources.`,
  instructions: ['Provide the sessionId to delete.'],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('Firecrawl browser session ID')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether Firecrawl deleted the session')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteBrowserSession(ctx.input.sessionId);

    return {
      output: {
        success: result.success
      },
      message: `Deleted Firecrawl browser session \`${ctx.input.sessionId}\`.`
    };
  });
