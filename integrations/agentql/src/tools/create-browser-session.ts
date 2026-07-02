import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tetraProxySchema = z.object({
  type: z.literal('tetra').describe('Use AgentQL managed proxy infrastructure'),
  countryCode: z
    .string()
    .optional()
    .describe('Two-letter country code for proxy location (e.g. "US", "GB"). Defaults to "US"')
});

let customProxySchema = z.object({
  type: z.literal('custom').describe('Use a custom proxy server'),
  url: z.string().describe('Proxy server URL'),
  username: z.string().optional().describe('Proxy authentication username'),
  password: z.string().optional().describe('Proxy authentication password')
});

export let createBrowserSession = SlateTool.create(spec, {
  name: 'Create Browser Session',
  key: 'create_browser_session',
  description: `Create a remote browser session that provides a Chrome DevTools Protocol (CDP) URL for connecting to a browser instance on AgentQL's infrastructure. Use this for browser automation tasks that require full browser control.

Returns a CDP URL for connecting via Playwright, Puppeteer, or other CDP-compatible tools, along with a session ID and base URL.`,
  instructions: [
    'Use "stealth" browser profile to help avoid bot detection on protected sites.',
    'Use "on_inactivity_timeout" shutdown mode to keep sessions alive for reuse within the timeout window.'
  ],
  constraints: ['Inactivity timeout must be between 5 and 86400 seconds.'],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      browserUaPreset: z
        .enum(['windows', 'macos', 'linux'])
        .optional()
        .describe(
          'User agent preset to simulate a specific operating system. Defaults to "linux"'
        ),
      browserProfile: z
        .enum(['light', 'stealth'])
        .optional()
        .describe(
          'Browser profile: "light" (default) or "stealth" for enhanced bot detection avoidance'
        ),
      shutdownMode: z
        .enum(['on_disconnect', 'on_inactivity_timeout'])
        .optional()
        .describe(
          'Session teardown behavior: "on_disconnect" (default) terminates when the last client disconnects, "on_inactivity_timeout" keeps the session alive for reuse'
        ),
      inactivityTimeoutSeconds: z
        .number()
        .optional()
        .describe('Session timeout duration in seconds (5-86400). Defaults to 300'),
      proxy: z
        .union([tetraProxySchema, customProxySchema])
        .optional()
        .describe('Proxy configuration for the browser session')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Unique identifier for the browser session'),
      cdpUrl: z
        .string()
        .describe('Chrome DevTools Protocol URL for connecting to the remote browser'),
      baseUrl: z.string().describe('Base URL of the browser session')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createSession({
      browserUaPreset: ctx.input.browserUaPreset,
      browserProfile: ctx.input.browserProfile,
      shutdownMode: ctx.input.shutdownMode,
      inactivityTimeoutSeconds: ctx.input.inactivityTimeoutSeconds,
      proxy: ctx.input.proxy
    });

    let profile = ctx.input.browserProfile ?? 'light';
    let shutdown = ctx.input.shutdownMode ?? 'on_disconnect';
    return {
      output: {
        sessionId: result.session_id,
        cdpUrl: result.cdp_url,
        baseUrl: result.base_url
      },
      message: `Created remote browser session **${result.session_id}** with **${profile}** profile and **${shutdown}** shutdown mode. CDP URL: \`${result.cdp_url}\``
    };
  })
  .build();
