import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let takeScreenshot = SlateTool.create(spec, {
  name: 'Take Screenshot',
  key: 'take_screenshot',
  description: `Capture a screenshot of a web page (by URL), or render HTML/Markdown content as an image. Returns a URL to the rendered screenshot.

Supports multiple output formats (PNG, JPEG, WebP, GIF, AVIF, etc.), full-page capture, element-level selection via CSS selectors, device emulation, content blocking (ads, cookie banners, chat widgets), dark mode, custom JavaScript/CSS injection, geolocation emulation, and caching.`,
  instructions: [
    'Exactly one of **url**, **html**, or **markdown** must be provided.',
    'For full-page screenshots, set **fullPage** to true. This automatically scrolls and triggers lazy-loaded content.',
    'Use **selector** to capture a specific element on the page by CSS selector.',
    'Use **blockAds**, **blockCookieBanners**, and **blockChats** for cleaner screenshots.',
    'Set **cache** to true and specify **cacheTtl** to avoid redundant renders. Cached screenshots are not counted against your quota.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      // Source
      url: z.string().optional().describe('URL of the web page to capture'),
      html: z.string().optional().describe('HTML content to render as an image'),
      markdown: z.string().optional().describe('Markdown content to render as an image'),

      // Format
      format: z
        .enum(['png', 'jpeg', 'jpg', 'webp', 'gif', 'jp2', 'tiff', 'avif', 'heif'])
        .optional()
        .describe('Output image format. Default: jpg'),
      imageQuality: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Image quality (0-100). Default: 80'),
      omitBackground: z
        .boolean()
        .optional()
        .describe('Make background transparent (PNG/WebP only)'),

      // Viewport & device
      viewportWidth: z
        .number()
        .optional()
        .describe('Browser viewport width in pixels. Default: 1280'),
      viewportHeight: z
        .number()
        .optional()
        .describe('Browser viewport height in pixels. Default: 1024'),
      viewportDevice: z
        .string()
        .optional()
        .describe(
          'Device preset for emulation (e.g., "iphone_13_pro_max"). Sets viewport dimensions, scale factor, and user agent automatically'
        ),
      deviceScaleFactor: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe('Device pixel ratio (1-5). Default: 1'),
      viewportMobile: z.boolean().optional().describe('Enable mobile viewport mode'),
      viewportLandscape: z.boolean().optional().describe('Landscape orientation'),

      // Full page
      fullPage: z
        .boolean()
        .optional()
        .describe('Capture the entire page including below-the-fold content'),
      fullPageScroll: z
        .boolean()
        .optional()
        .describe('Scroll to bottom before capturing (auto-enabled when fullPage=true)'),
      fullPageScrollDelay: z
        .number()
        .optional()
        .describe('Delay between scroll increments in microseconds. Default: 400'),
      fullPageMaxHeight: z.number().optional().describe('Maximum page height limit in pixels'),
      fullPageAlgorithm: z
        .enum(['default', 'by_sections'])
        .optional()
        .describe(
          'Rendering method. "by_sections" captures section by section for complex pages'
        ),

      // Element selection
      selector: z.string().optional().describe('CSS selector to capture a specific element'),
      clipX: z.number().optional().describe('X coordinate for clip region'),
      clipY: z.number().optional().describe('Y coordinate for clip region'),
      clipWidth: z.number().optional().describe('Width of clip region'),
      clipHeight: z.number().optional().describe('Height of clip region'),

      // Blocking
      blockAds: z.boolean().optional().describe('Block advertisements'),
      blockCookieBanners: z.boolean().optional().describe('Block cookie/GDPR consent banners'),
      blockBannersByHeuristics: z
        .boolean()
        .optional()
        .describe('Use heuristic-based banner blocking'),
      blockChats: z
        .boolean()
        .optional()
        .describe('Block chat widgets (Crisp, Intercom, Drift, etc.)'),
      blockTrackers: z.boolean().optional().describe('Disable analytics trackers'),
      blockRequests: z
        .array(z.string())
        .optional()
        .describe('Block requests matching URL patterns'),
      blockResources: z
        .array(
          z.enum([
            'document',
            'stylesheet',
            'image',
            'media',
            'font',
            'script',
            'texttrack',
            'xhr',
            'fetch',
            'eventsource',
            'websocket',
            'manifest',
            'other'
          ])
        )
        .optional()
        .describe('Block specific resource types'),

      // Content customization
      hideSelectors: z
        .array(z.string())
        .optional()
        .describe('CSS selectors of elements to hide'),
      scripts: z.string().optional().describe('JavaScript to inject and execute on the page'),
      styles: z.string().optional().describe('CSS to inject on the page'),
      click: z.string().optional().describe('CSS selector of element to click before capture'),
      hover: z.string().optional().describe('CSS selector of element to hover before capture'),

      // Visual emulation
      darkMode: z.boolean().optional().describe('Render in dark mode'),
      reducedMotion: z.boolean().optional().describe('Enable prefers-reduced-motion'),
      mediaType: z.enum(['print', 'screen']).optional().describe('Media type for rendering'),

      // Geolocation
      geolocationLatitude: z.number().optional().describe('Geolocation latitude'),
      geolocationLongitude: z.number().optional().describe('Geolocation longitude'),
      geolocationAccuracy: z.number().optional().describe('Geolocation accuracy in meters'),

      // Request config
      ipCountryCode: z
        .enum([
          'us',
          'gb',
          'de',
          'it',
          'fr',
          'cn',
          'ca',
          'es',
          'jp',
          'kr',
          'in',
          'au',
          'br',
          'mx',
          'nz',
          'pe',
          'is',
          'ie'
        ])
        .optional()
        .describe('Route through proxy in specified country'),
      userAgent: z.string().optional().describe('Custom user agent string'),
      authorization: z
        .string()
        .optional()
        .describe('HTTP Authorization header value for authenticated pages'),
      cookies: z
        .array(z.string())
        .optional()
        .describe('Cookies to set (format: "name=value; Domain=example.com")'),
      headers: z
        .array(z.string())
        .optional()
        .describe('Custom HTTP headers (format: "Header-Name:Value")'),
      timeZone: z
        .string()
        .optional()
        .describe('Timezone for rendering (e.g., "America/New_York")'),

      // Timing
      waitUntil: z
        .enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
        .optional()
        .describe('Page load event to wait for. Default: load'),
      delay: z.number().optional().describe('Additional wait time in seconds before capture'),
      timeout: z
        .number()
        .optional()
        .describe('Max request duration in seconds. Default: 60, max: 90'),
      waitForSelector: z
        .string()
        .optional()
        .describe('CSS selector to wait for before capture'),

      // Image resize
      imageWidth: z.number().optional().describe('Resize/thumbnail width in pixels'),
      imageHeight: z.number().optional().describe('Resize/thumbnail height in pixels'),

      // Caching
      cache: z.boolean().optional().describe('Enable CDN caching for this screenshot'),
      cacheTtl: z.number().optional().describe('Cache TTL in seconds (14400 to 2592000)'),
      cacheKey: z
        .string()
        .optional()
        .describe('Custom cache key for multiple cached versions'),

      // S3 Storage
      store: z.boolean().optional().describe('Upload screenshot to S3 storage'),
      storagePath: z.string().optional().describe('S3 object key/path'),
      storageBucket: z.string().optional().describe('Override default S3 bucket name'),

      // Error handling
      ignoreHostErrors: z
        .boolean()
        .optional()
        .describe('Continue despite HTTP errors from target site')
    })
  )
  .output(
    z.object({
      screenshotUrl: z.string().optional().describe('URL of the rendered screenshot'),
      storeLocation: z.string().optional().describe('S3 storage location if uploaded'),
      cacheUrl: z.string().optional().describe('Direct CDN cache URL for the screenshot')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.takeScreenshot(ctx.input);

    let source = ctx.input.url
      ? `URL \`${ctx.input.url}\``
      : ctx.input.html
        ? 'HTML content'
        : 'Markdown content';

    let format = ctx.input.format || 'jpg';

    return {
      output: {
        screenshotUrl: result.screenshotUrl,
        storeLocation: result.storeLocation,
        cacheUrl: result.cacheUrl
      },
      message: `Screenshot captured from ${source} in **${format}** format.${result.screenshotUrl ? ` [View screenshot](${result.screenshotUrl})` : ''}${result.storeLocation ? ` Uploaded to S3: \`${result.storeLocation}\`` : ''}${result.cacheUrl ? ` Cached at: ${result.cacheUrl}` : ''}`
    };
  })
  .build();
