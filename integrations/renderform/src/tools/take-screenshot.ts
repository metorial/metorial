import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let takeScreenshot = SlateTool.create(spec, {
  name: 'Take Screenshot',
  key: 'take_screenshot',
  description: `Take a screenshot of any website. The screenshot is automatically saved and hosted on a CDN. You can specify custom dimensions and an optional delay before capture.`,
  constraints: [
    'Width and height must be between 32 and 5000 pixels.',
    'waitTime must be between 0 and 5000 milliseconds.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('The full URL of the website to screenshot'),
      width: z.number().describe('Width of the screenshot in pixels (32-5000)'),
      height: z.number().describe('Height of the screenshot in pixels (32-5000)'),
      waitTime: z
        .number()
        .optional()
        .describe('Milliseconds to wait before taking the screenshot (0-5000)'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive a POST notification when the screenshot is ready')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique identifier for this screenshot request'),
      href: z.string().describe('CDN URL of the screenshot image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.takeScreenshot({
      url: ctx.input.url,
      width: ctx.input.width,
      height: ctx.input.height,
      waitTime: ctx.input.waitTime,
      webhookUrl: ctx.input.webhookUrl
    });

    return {
      output: {
        requestId: result.requestId,
        href: result.href
      },
      message: `Screenshot taken of ${ctx.input.url} (${ctx.input.width}x${ctx.input.height}). Available at: ${result.href}`
    };
  })
  .build();
