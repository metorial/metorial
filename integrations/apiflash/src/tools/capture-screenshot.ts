import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let captureScreenshot = SlateTool.create(spec, {
  name: 'Capture Screenshot',
  key: 'capture_screenshot',
  description: `Capture a screenshot of any publicly accessible webpage and receive a URL to the resulting image.
Supports configuring viewport size, image format, full-page capture, element-specific capture, CSS/JS injection, custom headers/cookies, geolocation, and more.
Use the **crop** parameter as \`"left,top,width,height"\` to capture a specific region. Use **element** with a CSS selector to capture a specific DOM element.
Set **fresh** to \`true\` to bypass the cache and force a new capture.`,
  instructions: [
    'The url must include the protocol (http:// or https://).',
    'Use the headers parameter as semicolon-separated key:value pairs, e.g. "Authorization:Bearer xyz;X-Custom:value".',
    'Use the cookies parameter as semicolon-separated key=value pairs, e.g. "session_id=abc123;user=john".',
    'For geolocation, provide both latitude and longitude together.'
  ],
  constraints: [
    'Rate limited to 20 requests/second with a 400-request burst capacity.',
    'The delay parameter accepts values between 0 and 10 seconds.',
    'The ttl parameter accepts values between 0 and 2592000 seconds (30 days).',
    'IP geolocation (ipLocation) is only available on enterprise plans.',
    'Transparency is only supported with PNG format.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z
        .string()
        .describe('Target webpage URL to capture (must include http:// or https://)'),
      format: z
        .enum(['jpeg', 'png', 'webp'])
        .optional()
        .describe('Image output format. Defaults to jpeg'),
      quality: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Image quality for jpeg/webp (0-100). Defaults to 80'),
      width: z.number().optional().describe('Viewport width in pixels. Defaults to 1920'),
      height: z.number().optional().describe('Viewport height in pixels. Defaults to 1080'),
      fullPage: z
        .boolean()
        .optional()
        .describe('Capture the full scrollable page instead of just the viewport'),
      scrollPage: z
        .boolean()
        .optional()
        .describe('Scroll through the page before capture to trigger lazy-loaded content'),
      delay: z
        .number()
        .min(0)
        .max(10)
        .optional()
        .describe('Additional wait time in seconds after page load (0-10)'),
      waitFor: z
        .string()
        .optional()
        .describe('CSS selector to wait for before capturing the screenshot'),
      waitUntil: z
        .enum(['dom_loaded', 'page_loaded', 'network_idle'])
        .optional()
        .describe('Page load event to wait for. Defaults to network_idle'),
      element: z
        .string()
        .optional()
        .describe('CSS selector to capture a specific element instead of the full viewport'),
      elementOverlap: z
        .boolean()
        .optional()
        .describe('Include elements that overlap the target element'),
      crop: z.string().optional().describe('Crop region as "left,top,width,height" in pixels'),
      thumbnailWidth: z
        .number()
        .optional()
        .describe(
          'Resize the screenshot to this width in pixels while maintaining aspect ratio'
        ),
      scaleFactor: z
        .number()
        .optional()
        .describe('Device scale factor: 1 for standard, 2 for retina/HiDPI'),
      transparent: z
        .boolean()
        .optional()
        .describe('Enable transparent background (PNG format only)'),
      css: z.string().optional().describe('Custom CSS to inject into the page before capture'),
      js: z
        .string()
        .optional()
        .describe('Custom JavaScript to execute on the page before capture'),
      headers: z
        .string()
        .optional()
        .describe('Custom HTTP headers as semicolon-separated key:value pairs'),
      cookies: z
        .string()
        .optional()
        .describe('Custom cookies as semicolon-separated key=value pairs'),
      acceptLanguage: z
        .string()
        .optional()
        .describe('Accept-Language header value for the request'),
      userAgent: z
        .string()
        .optional()
        .describe('Custom User-Agent string to use for the request'),
      proxy: z
        .string()
        .optional()
        .describe('Proxy server address (e.g. http://user:pass@host:port)'),
      latitude: z
        .number()
        .min(-90)
        .max(90)
        .optional()
        .describe('Geolocation latitude (-90 to 90)'),
      longitude: z
        .number()
        .min(-180)
        .max(180)
        .optional()
        .describe('Geolocation longitude (-180 to 180)'),
      accuracy: z.number().optional().describe('Geolocation accuracy in meters'),
      timeZone: z
        .string()
        .optional()
        .describe('Timezone for the browser context (e.g. "Europe/Paris")'),
      ipLocation: z
        .string()
        .optional()
        .describe('ISO alpha-2 country code for IP geolocation (enterprise only)'),
      failOnStatus: z
        .string()
        .optional()
        .describe(
          'Comma-separated HTTP status codes that should trigger a failure (e.g. "400,500-599")'
        ),
      noAds: z.boolean().optional().describe('Block ad networks and hide ad spaces'),
      noTracking: z.boolean().optional().describe('Block tracking scripts'),
      noCookieBanners: z
        .boolean()
        .optional()
        .describe('Automatically hide cookie consent banners'),
      ttl: z
        .number()
        .min(0)
        .max(2592000)
        .optional()
        .describe('Cache duration in seconds (0-2592000). Defaults to 86400'),
      fresh: z
        .boolean()
        .optional()
        .describe('Force a new screenshot, bypassing any cached version'),
      s3Endpoint: z
        .string()
        .optional()
        .describe('Custom S3-compatible endpoint URL for upload'),
      s3Region: z.string().optional().describe('AWS region for S3 upload'),
      s3AccessKeyId: z.string().optional().describe('AWS access key ID for S3 upload'),
      s3SecretKey: z.string().optional().describe('AWS secret key for S3 upload'),
      s3Bucket: z.string().optional().describe('S3 bucket name for upload'),
      s3Key: z.string().optional().describe('S3 object key (file path) for upload')
    })
  )
  .output(
    z.object({
      screenshotUrl: z.string().describe('URL where the captured screenshot can be accessed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.captureScreenshot(ctx.input);

    return {
      output: {
        screenshotUrl: result.url
      },
      message: `Screenshot captured for **${ctx.input.url}**. [View screenshot](${result.url})`
    };
  })
  .build();
