import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let convertFile = SlateTool.create(spec, {
  name: 'Convert File',
  key: 'convert_file',
  description: `Creates a file conversion task on Conversion Tools. Supports 100+ conversion types across documents, images, data formats, audio, video, eBooks, and subtitles.

Provide either a **fileId** (from a previously uploaded file) or a **url** (for URL-based conversions like website capture or remote file conversion). The conversion runs asynchronously — use the **Get Task** tool to check completion status.

Common conversion types include: \`convert.pdf_to_word\`, \`convert.json_to_excel\`, \`convert.website_to_pdf\`, \`convert.mp4_to_mp3\`, \`convert.png_to_webp\`, \`convert.markdown_to_pdf\`, \`convert.ocr_png_to_text\`, and many more. Use the **List Conversions** tool to see all available types and their options.`,
  instructions: [
    'Use the "List Conversions" tool first to discover the exact conversion type string and its available options.',
    'For file-based conversions, upload the file first and provide the fileId. For URL-based conversions (websites, remote files), provide the url in conversionOptions.',
    'Set waitForCompletion to true if you need the result immediately; otherwise the task runs in the background.'
  ],
  constraints: [
    'Each conversion task counts against your daily/monthly API quota unless sandbox mode is enabled.',
    'Conversion tasks and their files are retained for 24 hours by default.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      conversionType: z
        .string()
        .describe(
          'The conversion type identifier, e.g. "convert.pdf_to_word", "convert.json_to_excel", "convert.website_to_pdf"'
        ),
      fileId: z
        .string()
        .optional()
        .describe(
          'ID of a previously uploaded file to convert. Required for file-based conversions.'
        ),
      conversionOptions: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Conversion-specific options (e.g. { "url": "https://example.com" } for website conversions, { "delimiter": "comma" } for CSV output, { "quality": 90 } for image output)'
        ),
      callbackUrl: z
        .string()
        .optional()
        .describe('Webhook URL to receive a notification when the task completes'),
      waitForCompletion: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'If true, polls the task until it completes and returns the final status. Otherwise returns immediately after task creation.'
        )
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('The created task ID'),
      status: z.string().describe('Current task status: PENDING, RUNNING, SUCCESS, or ERROR'),
      resultFileId: z
        .string()
        .nullable()
        .describe('File ID of the converted result (available when status is SUCCESS)'),
      conversionProgress: z.number().describe('Conversion progress percentage (0-100)'),
      isSandbox: z.boolean().describe('Whether the task was run in sandbox mode')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let options: Record<string, unknown> = { ...ctx.input.conversionOptions };

    if (ctx.input.fileId) {
      options.file_id = ctx.input.fileId;
    }

    if (ctx.config.sandbox) {
      options.sandbox = true;
    }

    ctx.progress('Creating conversion task...');

    let taskResponse = await client.createTask(
      ctx.input.conversionType,
      options,
      ctx.input.callbackUrl
    );

    let taskId = taskResponse.task_id;
    let isSandbox = taskResponse.sandbox ?? false;

    if (ctx.input.waitForCompletion) {
      ctx.progress('Waiting for conversion to complete...');
      let finalStatus = await client.pollUntilComplete(taskId);

      return {
        output: {
          taskId,
          status: finalStatus.status,
          resultFileId: finalStatus.file_id,
          conversionProgress: finalStatus.conversionProgress,
          isSandbox
        },
        message:
          finalStatus.status === 'SUCCESS'
            ? `Conversion task **${taskId}** completed successfully. Result file ID: \`${finalStatus.file_id}\``
            : `Conversion task **${taskId}** finished with status **${finalStatus.status}**.${finalStatus.error ? ` Error: ${finalStatus.error}` : ''}`
      };
    }

    let currentStatus = await client.getTaskStatus(taskId);

    return {
      output: {
        taskId,
        status: currentStatus.status,
        resultFileId: currentStatus.file_id,
        conversionProgress: currentStatus.conversionProgress,
        isSandbox
      },
      message: `Conversion task **${taskId}** created with status **${currentStatus.status}**. Use the "Get Task" tool to check for completion.`
    };
  })
  .build();
