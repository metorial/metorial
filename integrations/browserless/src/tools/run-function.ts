import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrowserlessClient } from '../lib/client';
import { browserlessServiceError } from '../lib/errors';
import { spec } from '../spec';
import { fileAttachment, fileOutput } from './shared';

export let runFunction = SlateTool.create(spec, {
  name: 'Run Browser Function',
  key: 'run_function',
  description: `Execute custom JavaScript/Puppeteer code in a headless browser context. Browserless sets up a browser and page, then runs your code with access to the Puppeteer \`page\` object. Use this for multi-step browser interactions like navigating, filling forms, clicking buttons, and extracting data within a single request.`,
  instructions: [
    'Export a default async function, e.g. `export default async ({ page, context }) => { ... }`.',
    'For responseMode "json", return `{ data, type: "application/json" }` or another JSON-compatible value.',
    'For responseMode "attachment", return file bytes or a Browserless file response; bytes are returned through Slate attachments.'
  ],
  constraints: [
    'Code runs in a sandboxed environment. Each request launches a new browser session.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      code: z
        .string()
        .describe(
          'JavaScript code to execute. Receives `page` (Puppeteer Page) and optional `context` as parameters.'
        ),
      context: z
        .record(z.string(), z.any())
        .optional()
        .describe('Key-value context data passed to your function'),
      responseMode: z
        .enum(['json', 'attachment'])
        .optional()
        .default('json')
        .describe('Use "json" for structured data or "attachment" for file/binary responses')
    })
  )
  .output(
    z.object({
      result: z
        .any()
        .optional()
        .describe('Return value from the executed function in json mode'),
      mimeType: z.string().optional().describe('MIME type of the returned Slate attachment'),
      byteLength: z
        .number()
        .optional()
        .describe('Decoded byte length of the returned attachment'),
      filename: z
        .string()
        .optional()
        .describe('Filename reported by Browserless, when available'),
      attachmentCount: z.number().describe('Number of Slate attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.code.trim()) {
      throw browserlessServiceError('code cannot be empty.');
    }

    let client = new BrowserlessClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.responseMode === 'attachment') {
      let file = await client.runFunctionFile({
        code: ctx.input.code,
        context: ctx.input.context
      });

      return {
        output: fileOutput(file),
        attachments: [fileAttachment(file)],
        message: `Browser function executed successfully and returned an attachment (${file.byteLength} bytes).`
      };
    }

    let result = await client.runFunction({
      code: ctx.input.code,
      context: ctx.input.context
    });

    return {
      output: { result, attachmentCount: 0 },
      message: `Browser function executed successfully.`
    };
  })
  .build();
