import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSession = SlateTool.create(spec, {
  name: 'Create Browser Session',
  key: 'create_session',
  description: `Start a new cloud-hosted Chromium browser session with configurable proxy, CAPTCHA solving, ad blocking, stealth mode, and more. Returns a session ID, CDP WebSocket URL for programmatic control, and a live view URL for real-time observation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      initialUrl: z.string().optional().describe('URL to navigate to when the session starts'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags for session organization and filtering'),
      enableRecording: z
        .boolean()
        .optional()
        .describe('Enable session recording for later review'),
      proxyCountry: z
        .string()
        .optional()
        .describe('Two-letter country code for residential proxy targeting (e.g. "US", "GB")'),
      maxDurationMinutes: z
        .number()
        .optional()
        .describe('Maximum session duration in minutes (default: 20)'),
      idleTimeoutMinutes: z
        .number()
        .optional()
        .describe('Idle timeout in minutes before session auto-terminates (default: 5)'),
      readOnlyLiveView: z
        .boolean()
        .optional()
        .describe('If true, live view is read-only (no interaction)'),
      profileName: z
        .string()
        .optional()
        .describe('Name of a browser profile to load (restores cookies/state)'),
      persistProfile: z
        .boolean()
        .optional()
        .describe('Whether to persist the browser profile when session ends'),
      enableAdblock: z.boolean().optional().describe('Enable ad blocking'),
      enablePopupBlocker: z.boolean().optional().describe('Enable popup blocking'),
      enableCaptchaSolver: z.boolean().optional().describe('Enable automatic CAPTCHA solving'),
      headless: z.boolean().optional().describe('Run browser in headless mode'),
      viewportWidth: z.number().optional().describe('Browser viewport width in pixels'),
      viewportHeight: z.number().optional().describe('Browser viewport height in pixels'),
      extensionIds: z
        .array(z.string())
        .optional()
        .describe('IDs of Chrome extensions to load in the session'),
      enableExtraStealth: z
        .boolean()
        .optional()
        .describe('Enable extra stealth mode to avoid bot detection')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Unique identifier of the created session'),
      cdpUrl: z.string().describe('CDP WebSocket URL for connecting Playwright/Puppeteer'),
      liveViewUrl: z.string().describe('URL for real-time interactive browser observation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    let params: Record<string, unknown> = {};
    let session: Record<string, unknown> = {};
    let browser: Record<string, unknown> = {};

    if (input.initialUrl) session.initial_url = input.initialUrl;
    if (input.tags) session.tags = input.tags;
    if (input.enableRecording !== undefined)
      session.recording = { active: input.enableRecording };
    if (input.proxyCountry) session.proxy = { type: 'anchor', country: input.proxyCountry };
    if (input.maxDurationMinutes || input.idleTimeoutMinutes) {
      session.timeout = {
        ...(input.maxDurationMinutes ? { max_duration: input.maxDurationMinutes } : {}),
        ...(input.idleTimeoutMinutes ? { idle_timeout: input.idleTimeoutMinutes } : {})
      };
    }
    if (input.readOnlyLiveView !== undefined)
      session.live_view = { read_only: input.readOnlyLiveView };

    if (input.profileName || input.persistProfile !== undefined) {
      browser.profile = {
        ...(input.profileName ? { name: input.profileName } : {}),
        ...(input.persistProfile !== undefined ? { persist: input.persistProfile } : {})
      };
    }
    if (input.enableAdblock !== undefined) browser.adblock = { active: input.enableAdblock };
    if (input.enablePopupBlocker !== undefined)
      browser.popup_blocker = { active: input.enablePopupBlocker };
    if (input.enableCaptchaSolver !== undefined)
      browser.captcha_solver = { active: input.enableCaptchaSolver };
    if (input.headless !== undefined) browser.headless = { active: input.headless };
    if (input.viewportWidth || input.viewportHeight) {
      browser.viewport = {
        ...(input.viewportWidth ? { width: input.viewportWidth } : {}),
        ...(input.viewportHeight ? { height: input.viewportHeight } : {})
      };
    }
    if (input.extensionIds) browser.extensions = input.extensionIds;
    if (input.enableExtraStealth !== undefined)
      browser.extra_stealth = { active: input.enableExtraStealth };

    if (Object.keys(session).length > 0) params.session = session;
    if (Object.keys(browser).length > 0) params.browser = browser;

    let result = await client.createSession(params as any);

    return {
      output: {
        sessionId: result.id,
        cdpUrl: result.cdp_url,
        liveViewUrl: result.live_view_url
      },
      message: `Created browser session **${result.id}**. [Live View](${result.live_view_url})`
    };
  })
  .build();
