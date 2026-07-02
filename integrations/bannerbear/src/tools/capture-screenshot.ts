import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { spec } from '../spec';

export let captureScreenshot = SlateTool.create(spec, {
  name: 'Capture Screenshot',
  key: 'capture_screenshot',
  description: `Capture a screenshot of a public web page. Configurable browser viewport width, height, mobile user agent, and language settings. Returns the screenshot image URL.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('Full URL of the web page to screenshot'),
      width: z.number().optional().describe('Browser viewport width in pixels'),
      height: z.number().optional().describe('Browser viewport height in pixels'),
      mobile: z.boolean().optional().describe('Use a mobile user agent'),
      language: z
        .string()
        .optional()
        .describe('ISO 639-1 language code for the browser (e.g. "en", "fr", "de")'),
      metadata: z.string().optional().describe('Custom metadata to attach'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive a POST when the screenshot is ready')
    })
  )
  .output(
    z.object({
      screenshotUid: z.string().describe('UID of the screenshot'),
      status: z.string().describe('Rendering status'),
      screenshotImageUrl: z
        .string()
        .nullable()
        .describe('URL of the captured screenshot image'),
      createdAt: z.string().describe('Timestamp when the screenshot was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BannerbearClient({ token: ctx.auth.token });

    let result = await client.createScreenshot({
      url: ctx.input.url,
      width: ctx.input.width,
      height: ctx.input.height,
      mobile: ctx.input.mobile,
      language: ctx.input.language,
      metadata: ctx.input.metadata,
      webhook_url: ctx.input.webhookUrl
    });

    return {
      output: {
        screenshotUid: result.uid,
        status: result.status,
        screenshotImageUrl: result.screenshot_image_url || null,
        createdAt: result.created_at
      },
      message: `Screenshot ${result.status === 'completed' ? 'captured' : 'capture initiated'} for ${ctx.input.url} (UID: ${result.uid}). ${result.screenshot_image_url ? `[View screenshot](${result.screenshot_image_url})` : 'Screenshot is still rendering.'}`
    };
  })
  .build();
