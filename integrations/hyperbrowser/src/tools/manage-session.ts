import { SlateTool } from 'slates';
import { z } from 'zod';
import { HyperbrowserClient } from '../lib/client';
import { sessionDetailSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createSession = SlateTool.create(spec, {
  name: 'Create Browser Session',
  key: 'create_session',
  description: `Create a new cloud browser session with configurable options.
Returns connection endpoints (WebSocket, WebDriver) and a live view URL for real-time observation.
The session can be connected to via Playwright, Puppeteer, or Selenium.`,
  instructions: [
    'Use sessionOptions to configure proxy, stealth mode, CAPTCHA solving, and other browser settings.',
    'Remember to stop sessions when you are done with them to save credits.',
    'Use a profile to persist login state across sessions.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      useStealth: z
        .boolean()
        .optional()
        .describe('Enable stealth mode for anti-bot detection avoidance'),
      useProxy: z
        .boolean()
        .optional()
        .describe('Enable built-in rotating residential proxy (requires paid plan)'),
      proxyCountry: z
        .string()
        .optional()
        .describe('Two-letter country code for proxy location'),
      proxyServer: z.string().optional().describe('Custom proxy server URL'),
      solveCaptchas: z
        .boolean()
        .optional()
        .describe('Enable automatic CAPTCHA solving (requires paid plan)'),
      adblock: z.boolean().optional().describe('Block advertisements'),
      trackers: z.boolean().optional().describe('Block trackers'),
      annoyances: z.boolean().optional().describe('Block annoyances'),
      acceptCookies: z
        .boolean()
        .optional()
        .describe('Automatically accept cookie consent dialogs'),
      screen: z
        .object({
          width: z.number().optional(),
          height: z.number().optional()
        })
        .optional()
        .describe('Screen resolution'),
      timeoutMinutes: z.number().optional().describe('Session timeout in minutes (1-720)'),
      enableWebRecording: z.boolean().optional().describe('Enable rrweb DOM recording'),
      enableVideoWebRecording: z.boolean().optional().describe('Enable MP4 video recording'),
      profileId: z
        .string()
        .optional()
        .describe('Profile ID to attach for persistent browser state'),
      persistProfileChanges: z
        .boolean()
        .optional()
        .describe('Whether to save profile changes after session ends'),
      extensionIds: z.array(z.string()).optional().describe('Chrome extension IDs to attach'),
      saveDownloads: z.boolean().optional().describe('Enable file download saving')
    })
  )
  .output(sessionDetailSchema)
  .handleInvocation(async ctx => {
    let client = new HyperbrowserClient({ token: ctx.auth.token });

    let params: Record<string, unknown> = {};
    if (ctx.input.useStealth !== undefined) params.useStealth = ctx.input.useStealth;
    if (ctx.input.useProxy !== undefined) params.useProxy = ctx.input.useProxy;
    if (ctx.input.proxyCountry) params.proxyCountry = ctx.input.proxyCountry;
    if (ctx.input.proxyServer) params.proxyServer = ctx.input.proxyServer;
    if (ctx.input.solveCaptchas !== undefined) params.solveCaptchas = ctx.input.solveCaptchas;
    if (ctx.input.adblock !== undefined) params.adblock = ctx.input.adblock;
    if (ctx.input.trackers !== undefined) params.trackers = ctx.input.trackers;
    if (ctx.input.annoyances !== undefined) params.annoyances = ctx.input.annoyances;
    if (ctx.input.acceptCookies !== undefined) params.acceptCookies = ctx.input.acceptCookies;
    if (ctx.input.screen) params.screen = ctx.input.screen;
    if (ctx.input.timeoutMinutes !== undefined)
      params.timeoutMinutes = ctx.input.timeoutMinutes;
    if (ctx.input.enableWebRecording !== undefined)
      params.enableWebRecording = ctx.input.enableWebRecording;
    if (ctx.input.enableVideoWebRecording !== undefined)
      params.enableVideoWebRecording = ctx.input.enableVideoWebRecording;
    if (ctx.input.extensionIds) params.extensionIds = ctx.input.extensionIds;
    if (ctx.input.saveDownloads !== undefined) params.saveDownloads = ctx.input.saveDownloads;
    if (ctx.input.profileId) {
      params.profile = {
        id: ctx.input.profileId,
        persistChanges: ctx.input.persistProfileChanges ?? false
      };
    }

    let result = await client.createSession(params);

    return {
      output: {
        sessionId: result.id as string,
        teamId: result.teamId as string | undefined,
        status: result.status as string,
        wsEndpoint: result.wsEndpoint as string | undefined,
        liveUrl: result.liveUrl as string | undefined,
        sessionUrl: result.sessionUrl as string | undefined,
        webdriverEndpoint: result.webdriverEndpoint as string | undefined,
        createdAt: result.createdAt as string | undefined,
        creditsUsed: result.creditsUsed as number | null | undefined
      },
      message: `Session **${result.id}** created (status: ${result.status}).${result.liveUrl ? ` Live view: ${result.liveUrl}` : ''}`
    };
  })
  .build();

export let getSession = SlateTool.create(spec, {
  name: 'Get Session',
  key: 'get_session',
  description: `Retrieve details of an existing browser session including status, connection endpoints, and live view URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('Session ID to retrieve')
    })
  )
  .output(sessionDetailSchema)
  .handleInvocation(async ctx => {
    let client = new HyperbrowserClient({ token: ctx.auth.token });
    let result = await client.getSession(ctx.input.sessionId);

    return {
      output: {
        sessionId: result.id as string,
        teamId: result.teamId as string | undefined,
        status: result.status as string,
        wsEndpoint: result.wsEndpoint as string | undefined,
        liveUrl: result.liveUrl as string | undefined,
        sessionUrl: result.sessionUrl as string | undefined,
        webdriverEndpoint: result.webdriverEndpoint as string | undefined,
        createdAt: result.createdAt as string | undefined,
        creditsUsed: result.creditsUsed as number | null | undefined
      },
      message: `Session **${result.id}** is **${result.status}**.`
    };
  })
  .build();

export let stopSession = SlateTool.create(spec, {
  name: 'Stop Session',
  key: 'stop_session',
  description: `Stop a running browser session. This terminates the browser and releases resources. Session recordings and downloads become available after stopping.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('Session ID to stop')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Stopped session ID'),
      status: z.string().describe('Session status after stopping')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HyperbrowserClient({ token: ctx.auth.token });
    let result = await client.stopSession(ctx.input.sessionId);

    return {
      output: {
        sessionId: (result.id ?? ctx.input.sessionId) as string,
        status: (result.status ?? 'closed') as string
      },
      message: `Session **${ctx.input.sessionId}** has been stopped.`
    };
  })
  .build();

export let listSessions = SlateTool.create(spec, {
  name: 'List Sessions',
  key: 'list_sessions',
  description: `List browser sessions with pagination. Returns session details including status and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of sessions per page')
    })
  )
  .output(
    z.object({
      sessions: z
        .array(
          z.object({
            sessionId: z.string().describe('Session identifier'),
            status: z.string().describe('Session status'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            creditsUsed: z.number().optional().nullable().describe('Credits consumed')
          })
        )
        .describe('List of sessions'),
      totalCount: z.number().optional().describe('Total number of sessions'),
      page: z.number().optional().describe('Current page number'),
      perPage: z.number().optional().describe('Sessions per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HyperbrowserClient({ token: ctx.auth.token });
    let result = await client.listSessions({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let sessions = (result.sessions as Record<string, unknown>[]) ?? [];

    return {
      output: {
        sessions: sessions.map(s => ({
          sessionId: s.id as string,
          status: s.status as string,
          createdAt: s.createdAt as string | undefined,
          creditsUsed: s.creditsUsed as number | null | undefined
        })),
        totalCount: result.totalCount as number | undefined,
        page: result.page as number | undefined,
        perPage: result.perPage as number | undefined
      },
      message: `Found **${result.totalCount ?? sessions.length}** sessions. Showing **${sessions.length}** on this page.`
    };
  })
  .build();
