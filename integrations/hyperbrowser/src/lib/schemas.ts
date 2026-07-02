import { z } from 'zod';

export let screenConfigSchema = z
  .object({
    width: z.number().optional().describe('Screen width in pixels'),
    height: z.number().optional().describe('Screen height in pixels')
  })
  .optional()
  .describe('Screen resolution configuration');

export let sessionOptionsSchema = z
  .object({
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
      .describe('Two-letter country code for proxy location (e.g., "US", "GB")'),
    proxyState: z.string().optional().describe('US state abbreviation for proxy location'),
    proxyCity: z.string().optional().describe('City name for proxy location'),
    proxyServer: z
      .string()
      .optional()
      .describe('Custom proxy server URL (bring your own proxy)'),
    solveCaptchas: z
      .boolean()
      .optional()
      .describe('Enable automatic CAPTCHA solving (requires paid plan)'),
    adblock: z.boolean().optional().describe('Block advertisements'),
    trackers: z.boolean().optional().describe('Block trackers'),
    annoyances: z
      .boolean()
      .optional()
      .describe('Block annoyances (cookie banners, popups, etc.)'),
    acceptCookies: z
      .boolean()
      .optional()
      .describe('Automatically accept cookie consent dialogs'),
    operatingSystems: z
      .array(z.string())
      .optional()
      .describe('Allowed OS for browser fingerprint (e.g., ["windows", "macos"])'),
    device: z
      .string()
      .optional()
      .describe('Device type for fingerprinting (e.g., "desktop", "mobile")'),
    platform: z.string().optional().describe('Browser platform (e.g., "chrome", "firefox")'),
    locales: z.array(z.string()).optional().describe('Browser locale codes (e.g., ["en-US"])'),
    screen: screenConfigSchema,
    timeoutMinutes: z.number().optional().describe('Session timeout in minutes (1-720)'),
    enableWebRecording: z
      .boolean()
      .optional()
      .describe('Enable rrweb DOM recording (enabled by default)'),
    enableVideoWebRecording: z.boolean().optional().describe('Enable MP4 video recording'),
    extensionIds: z
      .array(z.string())
      .optional()
      .describe('Chrome extension IDs to attach to the session'),
    saveDownloads: z
      .boolean()
      .optional()
      .describe('Enable saving downloaded files for retrieval')
  })
  .optional()
  .describe('Browser session configuration options');

export let scrapeOptionsSchema = z
  .object({
    formats: z
      .array(z.enum(['markdown', 'html', 'links', 'screenshot']))
      .optional()
      .describe('Output formats to return'),
    onlyMainContent: z
      .boolean()
      .optional()
      .describe('Only extract the main content of the page'),
    includeTags: z.array(z.string()).optional().describe('HTML tags to include in extraction'),
    excludeTags: z
      .array(z.string())
      .optional()
      .describe('HTML tags to exclude from extraction'),
    waitFor: z.number().optional().describe('Time to wait in ms before scraping'),
    timeout: z.number().optional().describe('Timeout in ms for page navigation')
  })
  .optional()
  .describe('Scrape output configuration');

export let scrapeJobDataSchema = z.object({
  metadata: z
    .record(z.string(), z.any())
    .optional()
    .describe('Page metadata (title, description, etc.)'),
  markdown: z.string().optional().describe('Page content in markdown format'),
  html: z.string().optional().describe('Page content in HTML format'),
  links: z.array(z.string()).optional().describe('Links found on the page'),
  screenshot: z.string().optional().describe('Base64 encoded screenshot')
});

export let crawledPageSchema = z.object({
  url: z.string().describe('URL of the crawled page'),
  status: z.string().describe('Status of the page crawl (completed or failed)'),
  error: z.string().optional().nullable().describe('Error message if the page crawl failed'),
  metadata: z.record(z.string(), z.any()).optional().describe('Page metadata'),
  markdown: z.string().optional().describe('Page content in markdown format'),
  html: z.string().optional().describe('Page content in HTML format'),
  links: z.array(z.string()).optional().describe('Links found on the page'),
  screenshot: z.string().optional().describe('Base64 encoded screenshot')
});

export let webSearchResultSchema = z.object({
  title: z.string().describe('Title of the search result'),
  url: z.string().describe('URL of the search result'),
  description: z.string().describe('Description/snippet of the search result')
});

export let sessionDetailSchema = z.object({
  sessionId: z.string().describe('Unique session identifier'),
  teamId: z.string().optional().describe('Team identifier'),
  status: z.string().describe('Session status (active, closed, or error)'),
  wsEndpoint: z
    .string()
    .optional()
    .describe('WebSocket endpoint for Playwright/Puppeteer connection'),
  liveUrl: z.string().optional().describe('URL for real-time session viewing'),
  sessionUrl: z.string().optional().describe('Dashboard URL for the session'),
  webdriverEndpoint: z
    .string()
    .optional()
    .describe('WebDriver endpoint for Selenium connection'),
  createdAt: z.string().optional().describe('ISO 8601 timestamp of session creation'),
  creditsUsed: z.number().optional().nullable().describe('Number of credits consumed')
});

export let profileSchema = z.object({
  profileId: z.string().describe('Unique profile identifier'),
  name: z.string().optional().nullable().describe('Profile display name'),
  teamId: z.string().optional().describe('Team identifier'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().optional().describe('ISO 8601 last update timestamp')
});
