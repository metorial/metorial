import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import type { ProxyConfig } from '../lib/types';
import { spec } from '../spec';

let proxyConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('browserbase'),
    domainPattern: z.string().optional().describe('Domain pattern to match for proxying'),
    geolocation: z
      .object({
        country: z.string().describe('ISO country code'),
        city: z.string().optional().describe('City name'),
        state: z.string().optional().describe('State or region')
      })
      .optional()
      .describe('Geolocation targeting for the proxy')
  }),
  z.object({
    type: z.literal('external'),
    server: z.string().describe('External proxy server URL'),
    domainPattern: z.string().optional().describe('Domain pattern to match for proxying'),
    username: z.string().optional().describe('Proxy authentication username'),
    password: z.string().optional().describe('Proxy authentication password')
  }),
  z.object({
    type: z.literal('none'),
    domainPattern: z.string().optional().describe('Domain pattern to exclude from proxying')
  })
]);

export let createSession = SlateTool.create(spec, {
  name: 'Create Session',
  key: 'create_session',
  description: `Create a new cloud browser session on Browserbase. Configure the session with a specific region, timeout, proxy settings, browser viewport, stealth mode, ad blocking, captcha solving, and persistent context. Returns connection URLs for Playwright, Puppeteer, or Selenium integration.`,
  instructions: [
    'The projectId from config is used automatically if not overridden.',
    'Set keepAlive to true to keep the session alive after client disconnections.',
    'Use the connectUrl from the response to connect via WebSocket with Playwright or Puppeteer.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      extensionId: z
        .string()
        .optional()
        .describe('ID of an uploaded Chrome extension to load into the session'),
      keepAlive: z
        .boolean()
        .optional()
        .describe('Keep session alive after disconnections (Hobby Plan and above)'),
      region: z
        .enum(['us-west-2', 'us-east-1', 'eu-central-1', 'ap-southeast-1'])
        .optional()
        .describe('Cloud region for the session'),
      timeout: z
        .number()
        .min(60)
        .max(21600)
        .optional()
        .describe('Session timeout in seconds (60-21600). Defaults to project setting.'),
      userMetadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Arbitrary key-value metadata to attach to the session'),
      enableProxy: z.boolean().optional().describe('Enable the default Browserbase proxy'),
      proxies: z
        .array(proxyConfigSchema)
        .optional()
        .describe('Advanced proxy configurations. Overrides enableProxy if provided.'),
      contextId: z
        .string()
        .optional()
        .describe(
          'Context ID to restore persistent browser state (cookies, localStorage, etc.)'
        ),
      persistContext: z
        .boolean()
        .optional()
        .describe('Whether to persist browser state after the session ends'),
      viewportWidth: z.number().optional().describe('Browser viewport width in pixels'),
      viewportHeight: z.number().optional().describe('Browser viewport height in pixels'),
      blockAds: z.boolean().optional().describe('Enable ad blocking'),
      solveCaptchas: z.boolean().optional().describe('Enable automatic captcha solving'),
      recordSession: z.boolean().optional().describe('Enable video recording for the session'),
      logSession: z.boolean().optional().describe('Enable CDP logging for debugging'),
      advancedStealth: z
        .boolean()
        .optional()
        .describe('Enable advanced stealth mode for anti-detection'),
      os: z
        .enum(['windows', 'mac', 'linux', 'mobile', 'tablet'])
        .optional()
        .describe('Operating system fingerprint')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Unique session identifier'),
      status: z.string().describe('Session status'),
      region: z.string().describe('Session region'),
      connectUrl: z
        .string()
        .optional()
        .describe('WebSocket URL for CDP connection via Playwright/Puppeteer'),
      seleniumRemoteUrl: z.string().optional().describe('HTTP URL for Selenium connection'),
      signingKey: z.string().optional().describe('Signing key for HTTP connections'),
      contextId: z.string().nullable().describe('Linked context ID if using persistent state'),
      createdAt: z.string().describe('Session creation timestamp'),
      expiresAt: z.string().describe('Session expiration timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let browserSettings: Record<string, unknown> = {};

    if (ctx.input.contextId || ctx.input.persistContext !== undefined) {
      browserSettings.context = {
        ...(ctx.input.contextId ? { id: ctx.input.contextId } : {}),
        ...(ctx.input.persistContext !== undefined
          ? { persist: ctx.input.persistContext }
          : {})
      };
    }

    if (ctx.input.viewportWidth || ctx.input.viewportHeight) {
      browserSettings.viewport = {
        ...(ctx.input.viewportWidth ? { width: ctx.input.viewportWidth } : {}),
        ...(ctx.input.viewportHeight ? { height: ctx.input.viewportHeight } : {})
      };
    }

    if (ctx.input.blockAds !== undefined) browserSettings.blockAds = ctx.input.blockAds;
    if (ctx.input.solveCaptchas !== undefined)
      browserSettings.solveCaptchas = ctx.input.solveCaptchas;
    if (ctx.input.recordSession !== undefined)
      browserSettings.recordSession = ctx.input.recordSession;
    if (ctx.input.logSession !== undefined) browserSettings.logSession = ctx.input.logSession;
    if (ctx.input.advancedStealth !== undefined)
      browserSettings.advancedStealth = ctx.input.advancedStealth;
    if (ctx.input.os) browserSettings.os = ctx.input.os;

    let proxies: boolean | ProxyConfig[] | undefined;
    if (ctx.input.proxies && ctx.input.proxies.length > 0) {
      proxies = ctx.input.proxies as ProxyConfig[];
    } else if (ctx.input.enableProxy) {
      proxies = true;
    }

    let session = await client.createSession({
      projectId: ctx.config.projectId,
      extensionId: ctx.input.extensionId,
      keepAlive: ctx.input.keepAlive,
      region: ctx.input.region,
      timeout: ctx.input.timeout,
      userMetadata: ctx.input.userMetadata,
      proxies,
      browserSettings:
        Object.keys(browserSettings).length > 0 ? (browserSettings as any) : undefined
    });

    return {
      output: {
        sessionId: session.sessionId,
        status: session.status,
        region: session.region,
        connectUrl: session.connectUrl,
        seleniumRemoteUrl: session.seleniumRemoteUrl,
        signingKey: session.signingKey,
        contextId: session.contextId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt
      },
      message: `Created browser session **${session.sessionId}** in region **${session.region}** with status **${session.status}**.`
    };
  })
  .build();
