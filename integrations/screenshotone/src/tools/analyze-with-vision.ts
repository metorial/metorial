import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let analyzeWithVision = SlateTool.create(spec, {
  name: 'Analyze Page with Vision',
  key: 'analyze_with_vision',
  description: `Capture a screenshot and analyze it using OpenAI Vision in a single API call. Provide a prompt to describe what you want to learn from the visual content of the page.

Useful for visual QA, accessibility auditing, content analysis, competitive analysis, and any task that requires understanding what a rendered page looks like.`,
  instructions: [
    'An **openaiApiKey** is required for this tool.',
    'Provide a descriptive **visionPrompt** explaining what to analyze in the screenshot.',
    'Use **visionMaxTokens** to control the length of the AI response.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      // Source
      url: z.string().optional().describe('URL of the web page to capture and analyze'),
      html: z.string().optional().describe('HTML content to render and analyze'),
      markdown: z.string().optional().describe('Markdown content to render and analyze'),

      // Vision
      openaiApiKey: z.string().describe('Your OpenAI API key for Vision analysis'),
      visionPrompt: z.string().describe('Prompt describing what to analyze in the screenshot'),
      visionMaxTokens: z
        .number()
        .optional()
        .describe('Maximum tokens for the Vision response'),

      // Viewport & device
      viewportWidth: z.number().optional().describe('Browser viewport width in pixels'),
      viewportHeight: z.number().optional().describe('Browser viewport height in pixels'),
      viewportDevice: z.string().optional().describe('Device preset for emulation'),
      fullPage: z.boolean().optional().describe('Capture the entire page'),

      // Blocking
      blockAds: z.boolean().optional().describe('Block advertisements'),
      blockCookieBanners: z.boolean().optional().describe('Block cookie banners'),
      blockChats: z.boolean().optional().describe('Block chat widgets'),

      // Visual emulation
      darkMode: z.boolean().optional().describe('Render in dark mode'),

      // Timing
      waitUntil: z
        .enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
        .optional()
        .describe('Page load event to wait for'),
      delay: z.number().optional().describe('Additional wait time in seconds before capture'),
      timeout: z.number().optional().describe('Max request duration in seconds')
    })
  )
  .output(
    z.object({
      screenshotUrl: z.string().optional().describe('URL of the captured screenshot'),
      visionResult: z.unknown().optional().describe('OpenAI Vision analysis result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.takeScreenshot({
      url: ctx.input.url,
      html: ctx.input.html,
      markdown: ctx.input.markdown,
      format: 'png',
      openaiApiKey: ctx.input.openaiApiKey,
      visionPrompt: ctx.input.visionPrompt,
      visionMaxTokens: ctx.input.visionMaxTokens,
      viewportWidth: ctx.input.viewportWidth,
      viewportHeight: ctx.input.viewportHeight,
      viewportDevice: ctx.input.viewportDevice,
      fullPage: ctx.input.fullPage,
      blockAds: ctx.input.blockAds,
      blockCookieBanners: ctx.input.blockCookieBanners,
      blockChats: ctx.input.blockChats,
      darkMode: ctx.input.darkMode,
      waitUntil: ctx.input.waitUntil,
      delay: ctx.input.delay,
      timeout: ctx.input.timeout
    });

    let source = ctx.input.url
      ? `URL \`${ctx.input.url}\``
      : ctx.input.html
        ? 'HTML content'
        : 'Markdown content';

    return {
      output: {
        screenshotUrl: result.screenshotUrl,
        visionResult: result.metadata
      },
      message: `Vision analysis completed for ${source}. Prompt: "${ctx.input.visionPrompt}"`
    };
  })
  .build();
