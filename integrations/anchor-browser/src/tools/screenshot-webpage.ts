import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let screenshotWebpage = SlateTool.create(spec, {
  name: 'Screenshot Webpage',
  key: 'screenshot_webpage',
  description: `Capture a screenshot of a webpage. Can be used standalone or within an existing session. Returns a base64-encoded image. Supports configurable viewport size, quality, full-page capture, and S3 upload.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z
        .string()
        .optional()
        .describe(
          'URL to screenshot (not needed if using an active session with a loaded page)'
        ),
      width: z.number().optional().describe('Viewport width in pixels (default: 1440)'),
      height: z.number().optional().describe('Viewport height in pixels (default: 900)'),
      imageQuality: z.number().optional().describe('Image quality 1-100 (default: 80)'),
      waitMs: z
        .number()
        .optional()
        .describe('Milliseconds to wait after page load before capturing'),
      scrollAllContent: z
        .boolean()
        .optional()
        .describe('Scroll through all content before capturing'),
      captureFullHeight: z.boolean().optional().describe('Capture the full page height'),
      s3TargetAddress: z
        .string()
        .optional()
        .describe('Presigned S3 URL to upload the screenshot to'),
      sessionId: z.string().optional().describe('Existing session ID to capture from')
    })
  )
  .output(
    z.object({
      image: z.string().describe('Base64-encoded screenshot image or S3 reference')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    let result = await client.screenshotWebpage(
      {
        url: input.url,
        width: input.width,
        height: input.height,
        image_quality: input.imageQuality,
        wait: input.waitMs,
        scroll_all_content: input.scrollAllContent,
        capture_full_height: input.captureFullHeight,
        s3_target_address: input.s3TargetAddress
      },
      input.sessionId
    );

    return {
      output: {
        image: result.image
      },
      message: `Screenshot captured${input.url ? ` for **${input.url}**` : ''}${input.s3TargetAddress ? ' and uploaded to S3' : ''}.`
    };
  })
  .build();
