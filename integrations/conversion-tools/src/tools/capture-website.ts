import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let captureWebsite = SlateTool.create(spec, {
  name: 'Capture Website',
  key: 'capture_website',
  description: `Captures a website as a PDF, JPG, or PNG screenshot. Supports custom viewport dimensions, device emulation, page orientation, margins, and JavaScript rendering options.

This is a convenience wrapper around the conversion types \`convert.website_to_pdf\`, \`convert.website_to_jpg\`, and \`convert.website_to_png\`.`,
  instructions: [
    'For device emulation, use deviceName with one of the pre-configured device profiles (e.g. "iPhone 14", "iPad Pro", "Pixel 7").',
    'For PDF output, use pageOrientation and margins. For image output, use viewportWidth and viewportHeight.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('The website URL to capture'),
      outputFormat: z.enum(['pdf', 'jpg', 'png']).describe('Output format for the capture'),
      includeImages: z
        .enum(['yes', 'no'])
        .optional()
        .describe('Whether to include images in the capture'),
      includeBackground: z
        .enum(['yes', 'no'])
        .optional()
        .describe('Whether to include CSS background in the capture'),
      javascript: z
        .enum(['yes', 'no'])
        .optional()
        .describe('Whether to enable JavaScript rendering'),
      viewportWidth: z
        .number()
        .optional()
        .describe('Viewport width in pixels (for image output)'),
      viewportHeight: z
        .number()
        .optional()
        .describe('Viewport height in pixels (for image output)'),
      deviceName: z
        .string()
        .optional()
        .describe('Device name for emulation (e.g. "iPhone 14", "iPad Pro", "Pixel 7")'),
      pageOrientation: z
        .enum(['portrait', 'landscape'])
        .optional()
        .describe('Page orientation (for PDF output)'),
      pageSize: z
        .string()
        .optional()
        .describe('Page size (for PDF output, e.g. "A4", "Letter")'),
      marginTop: z.number().optional().describe('Top margin in mm (for PDF output)'),
      marginBottom: z.number().optional().describe('Bottom margin in mm (for PDF output)'),
      marginLeft: z.number().optional().describe('Left margin in mm (for PDF output)'),
      marginRight: z.number().optional().describe('Right margin in mm (for PDF output)'),
      waitForCompletion: z
        .boolean()
        .optional()
        .default(true)
        .describe('If true, polls until the capture completes'),
      callbackUrl: z
        .string()
        .optional()
        .describe('Webhook URL to receive notification when the capture completes')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('The capture task ID'),
      status: z.string().describe('Current task status: PENDING, RUNNING, SUCCESS, or ERROR'),
      resultFileId: z
        .string()
        .nullable()
        .describe('File ID of the captured result (available when SUCCESS)'),
      conversionProgress: z.number().describe('Capture progress percentage (0-100)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let conversionType = `convert.website_to_${ctx.input.outputFormat}`;

    let options: Record<string, unknown> = {
      url: ctx.input.url
    };

    if (ctx.config.sandbox) {
      options.sandbox = true;
    }

    if (ctx.input.includeImages) options.images = ctx.input.includeImages;
    if (ctx.input.includeBackground) options.background = ctx.input.includeBackground;
    if (ctx.input.javascript) options.javascript = ctx.input.javascript;
    if (ctx.input.viewportWidth) options.viewport_width = ctx.input.viewportWidth;
    if (ctx.input.viewportHeight) options.viewport_height = ctx.input.viewportHeight;
    if (ctx.input.deviceName) options.device = ctx.input.deviceName;
    if (ctx.input.pageOrientation) options.orientation = ctx.input.pageOrientation;
    if (ctx.input.pageSize) options.page_size = ctx.input.pageSize;
    if (ctx.input.marginTop !== undefined) options.margin_top = ctx.input.marginTop;
    if (ctx.input.marginBottom !== undefined) options.margin_bottom = ctx.input.marginBottom;
    if (ctx.input.marginLeft !== undefined) options.margin_left = ctx.input.marginLeft;
    if (ctx.input.marginRight !== undefined) options.margin_right = ctx.input.marginRight;

    ctx.progress(`Capturing ${ctx.input.url} as ${ctx.input.outputFormat.toUpperCase()}...`);

    let taskResponse = await client.createTask(conversionType, options, ctx.input.callbackUrl);
    let taskId = taskResponse.task_id;

    if (ctx.input.waitForCompletion) {
      ctx.progress('Waiting for capture to complete...');
      let finalStatus = await client.pollUntilComplete(taskId);

      return {
        output: {
          taskId,
          status: finalStatus.status,
          resultFileId: finalStatus.file_id,
          conversionProgress: finalStatus.conversionProgress
        },
        message:
          finalStatus.status === 'SUCCESS'
            ? `Website captured as ${ctx.input.outputFormat.toUpperCase()}. Task **${taskId}**, result file: \`${finalStatus.file_id}\``
            : `Capture task **${taskId}** finished with status **${finalStatus.status}**.${finalStatus.error ? ` Error: ${finalStatus.error}` : ''}`
      };
    }

    let currentStatus = await client.getTaskStatus(taskId);

    return {
      output: {
        taskId,
        status: currentStatus.status,
        resultFileId: currentStatus.file_id,
        conversionProgress: currentStatus.conversionProgress
      },
      message: `Capture task **${taskId}** created (status: ${currentStatus.status}). Use "Get Task" to check for completion.`
    };
  })
  .build();
