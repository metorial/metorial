import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let captureWebsite = SlateTool.create(spec, {
  name: 'Capture Website',
  key: 'capture_website',
  description: `Capture a website as a PDF document or take a screenshot as PNG/JPG.

Useful for archiving web pages, generating reports from web content, or taking screenshots for documentation.`,
  instructions: [
    'Set outputFormat to "pdf" for a PDF document or "png"/"jpg" for a screenshot.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      websiteUrl: z.string().describe('URL of the website to capture'),
      outputFormat: z
        .enum(['pdf', 'png', 'jpg'])
        .describe('Output format: "pdf" for document, "png" or "jpg" for screenshot'),
      pageWidth: z.number().optional().describe('Page/viewport width in pixels'),
      pageHeight: z.number().optional().describe('Page/viewport height in pixels'),
      marginTop: z.number().optional().describe('Top margin in mm (PDF only)'),
      marginBottom: z.number().optional().describe('Bottom margin in mm (PDF only)'),
      marginLeft: z.number().optional().describe('Left margin in mm (PDF only)'),
      marginRight: z.number().optional().describe('Right margin in mm (PDF only)'),
      printBackground: z
        .boolean()
        .optional()
        .describe('Include background graphics (PDF only)'),
      displayHeaderFooter: z
        .boolean()
        .optional()
        .describe('Display header and footer (PDF only)'),
      waitUntil: z
        .string()
        .optional()
        .describe('When to consider navigation complete (e.g., "load", "networkidle0")'),
      waitTime: z.number().optional().describe('Additional wait time in ms after page load'),
      tag: z.string().optional().describe('Tag to label the job'),
      waitForCompletion: z
        .boolean()
        .optional()
        .default(true)
        .describe('Wait for capture to complete')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the capture job'),
      status: z.string().describe('Current status of the job'),
      resultUrl: z
        .string()
        .optional()
        .describe('Temporary download URL for the captured file'),
      resultFilename: z.string().optional().describe('Filename of the captured file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let captureTask: Record<string, any> = {
      operation: 'capture-website',
      url: ctx.input.websiteUrl,
      output_format: ctx.input.outputFormat
    };

    if (ctx.input.pageWidth) captureTask.screen_width = ctx.input.pageWidth;
    if (ctx.input.pageHeight) captureTask.screen_height = ctx.input.pageHeight;
    if (ctx.input.marginTop !== undefined) captureTask.margin_top = ctx.input.marginTop;
    if (ctx.input.marginBottom !== undefined)
      captureTask.margin_bottom = ctx.input.marginBottom;
    if (ctx.input.marginLeft !== undefined) captureTask.margin_left = ctx.input.marginLeft;
    if (ctx.input.marginRight !== undefined) captureTask.margin_right = ctx.input.marginRight;
    if (ctx.input.printBackground !== undefined)
      captureTask.print_background = ctx.input.printBackground;
    if (ctx.input.displayHeaderFooter !== undefined)
      captureTask.display_header_footer = ctx.input.displayHeaderFooter;
    if (ctx.input.waitUntil) captureTask.wait_until = ctx.input.waitUntil;
    if (ctx.input.waitTime) captureTask.wait_time = ctx.input.waitTime;

    let tasks: Record<string, any> = {
      'capture-website': captureTask,
      'export-file': {
        operation: 'export/url',
        input: ['capture-website']
      }
    };

    let job = await client.createJob(tasks, ctx.input.tag);

    if (ctx.input.waitForCompletion) {
      job = await client.waitForJob(job.id);
    }

    let exportTask = (job.tasks ?? []).find((t: any) => t.operation === 'export/url');
    let resultFile = exportTask?.result?.files?.[0];

    return {
      output: {
        jobId: job.id,
        status: job.status,
        resultUrl: resultFile?.url,
        resultFilename: resultFile?.filename
      },
      message:
        job.status === 'finished'
          ? `Website captured as **${ctx.input.outputFormat.toUpperCase()}**. ${resultFile?.url ? `Download: ${resultFile.url}` : ''}`
          : `Capture job created (status: ${job.status}).`
    };
  })
  .build();
