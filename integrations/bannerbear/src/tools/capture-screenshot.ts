import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { stateMessage } from '../lib/contracts';
import { deliverGeneratedFiles, screenshotOutput } from '../lib/results';
import { projectIdSchema } from '../lib/schemas';
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
      projectId: projectIdSchema,
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
    const client = new BannerbearClient({ ...ctx.auth, projectId: ctx.input.projectId });
    const result = await client.createScreenshot({
      url: ctx.input.url,
      width: ctx.input.width,
      height: ctx.input.height,
      mobile: ctx.input.mobile,
      language: ctx.input.language,
      metadata: ctx.input.metadata,
      webhook_url: ctx.input.webhookUrl
    });
    const output = screenshotOutput(result);
    await deliverGeneratedFiles(ctx, 'screenshot', result);
    return {
      output,
      message: `Screenshot capture ${stateMessage(result.status)} (UID: ${output.screenshotUid}). Read its status with get_resource.`
    };
  })
  .build();
