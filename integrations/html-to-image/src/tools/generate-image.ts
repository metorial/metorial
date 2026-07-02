import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate an image from HTML/CSS markup. Provide HTML content with optional CSS styling to render a pixel-perfect image using the Chrome rendering engine. Supports Google Fonts, custom viewport dimensions, device scaling, render delays, and CSS selector cropping. Returns a permanent, CDN-cached image URL.`,
  instructions: [
    'Provide either `html` or `url` to generate an image, but not both.',
    'If using Google Fonts, separate multiple font names with a pipe character (e.g., "Roboto|Open Sans").',
    'Use `msDelay` when the page needs time for JavaScript to execute before capturing.',
    'Set `viewportWidth` and `viewportHeight` together to control the Chrome viewport size.'
  ],
  constraints: [
    'Device scale must be between 1 and 3.',
    'Either `html` or `url` is required, but not both.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      html: z.string().optional().describe('HTML markup to render as an image'),
      css: z.string().optional().describe('CSS styling to apply to the HTML'),
      url: z
        .string()
        .optional()
        .describe('Public URL to screenshot instead of providing HTML'),
      googleFonts: z
        .string()
        .optional()
        .describe('Google Fonts to load, separated by pipe (e.g., "Roboto|Open Sans")'),
      msDelay: z
        .number()
        .optional()
        .describe('Milliseconds to delay before capturing the image'),
      deviceScale: z
        .number()
        .min(1)
        .max(3)
        .optional()
        .describe('Pixel ratio for the screenshot (1-3)'),
      renderWhenReady: z
        .boolean()
        .optional()
        .describe('Wait for ScreenshotReady() to be called from JavaScript before capturing'),
      viewportWidth: z.number().optional().describe('Chrome viewport width in pixels'),
      viewportHeight: z.number().optional().describe('Chrome viewport height in pixels'),
      selector: z
        .string()
        .optional()
        .describe('CSS selector to crop the image to a specific element'),
      fullScreen: z.boolean().optional().describe('Capture the entire page height'),
      colorScheme: z
        .enum(['light', 'dark'])
        .optional()
        .describe('Color scheme preference for the page'),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone identifier (e.g., "America/New_York")'),
      blockConsentBanners: z
        .boolean()
        .optional()
        .describe('Automatically hide cookie consent popups')
    })
  )
  .output(
    z.object({
      imageId: z.string().describe('Unique identifier for the generated image'),
      url: z.string().describe('Permanent CDN-cached URL of the generated image'),
      pngUrl: z.string().describe('Direct URL to the PNG version'),
      jpgUrl: z.string().describe('Direct URL to the JPG version'),
      webpUrl: z.string().describe('Direct URL to the WebP version'),
      pdfUrl: z.string().describe('Direct URL to the PDF version')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.createImage({
      html: ctx.input.html,
      css: ctx.input.css,
      url: ctx.input.url,
      googleFonts: ctx.input.googleFonts,
      msDelay: ctx.input.msDelay,
      deviceScale: ctx.input.deviceScale,
      renderWhenReady: ctx.input.renderWhenReady,
      viewportWidth: ctx.input.viewportWidth,
      viewportHeight: ctx.input.viewportHeight,
      selector: ctx.input.selector,
      fullScreen: ctx.input.fullScreen,
      colorScheme: ctx.input.colorScheme,
      timezone: ctx.input.timezone,
      blockConsentBanners: ctx.input.blockConsentBanners
    });

    let baseUrl = result.url;

    return {
      output: {
        imageId: result.imageId,
        url: baseUrl,
        pngUrl: `${baseUrl}.png`,
        jpgUrl: `${baseUrl}.jpg`,
        webpUrl: `${baseUrl}.webp`,
        pdfUrl: `${baseUrl}.pdf`
      },
      message: `Image generated successfully. Available at: ${baseUrl}`
    };
  })
  .build();
