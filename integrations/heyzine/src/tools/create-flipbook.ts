import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyzineClient } from '../lib/client';
import { spec } from '../spec';

export let createFlipbook = SlateTool.create(spec, {
  name: 'Create Flipbook',
  key: 'create_flipbook',
  description: `Converts a PDF, DOCX, or PPTX file into an interactive digital flipbook with page-turning effects.
Supports both **synchronous** (waits for conversion) and **asynchronous** (returns immediately) modes.
You can customize the flipbook appearance including title, subtitle, logo, background color, and UI controls.
Use a template flipbook ID to copy styling from an existing flipbook.`,
  instructions: [
    'The source file URL must be a direct link with no redirections.',
    'For large documents, use async mode to avoid timeout issues.',
    'Async mode returns a state field: "started", "processed", or "failed". The flipbook URL shows a not-found page until processing completes.'
  ],
  constraints: [
    'Free plan is limited to 5 flipbooks. Paid plans offer unlimited conversions.',
    'Logo placement requires Standard Plan or above.'
  ]
})
  .input(
    z.object({
      sourceUrl: z
        .string()
        .describe(
          'Direct URL to the PDF, DOCX, or PPTX file to convert. Must be a direct link with no redirections.'
        ),
      async: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, returns immediately without waiting for conversion to complete.'),
      title: z.string().optional().describe('Title shown on the flipbook and social shares.'),
      subtitle: z.string().optional().describe('Subtitle shown on the flipbook.'),
      description: z.string().optional().describe('Description shown on the flipbook.'),
      templateFlipbookId: z
        .string()
        .optional()
        .describe(
          'Flipbook ID to use as a template. Copies logo, page effect, background, controls, and styles.'
        ),
      logoUrl: z
        .string()
        .optional()
        .describe('URL to a company logo to place in the flipbook.'),
      backgroundColor: z.string().optional().describe('Background color for the flipbook.'),
      downloadButton: z.boolean().optional().describe('Show download button on the flipbook.'),
      fullscreen: z.boolean().optional().describe('Show fullscreen button on the flipbook.'),
      share: z.boolean().optional().describe('Show share button on the flipbook.'),
      navigationButtons: z
        .boolean()
        .optional()
        .describe('Show navigation buttons on the flipbook.')
    })
  )
  .output(
    z.object({
      flipbookId: z.string().describe('Unique identifier of the created flipbook.'),
      flipbookUrl: z.string().describe('URL of the flipbook.'),
      thumbnailUrl: z.string().describe('URL of the flipbook thumbnail image.'),
      pdfUrl: z.string().describe('URL of the source PDF.'),
      state: z
        .string()
        .optional()
        .describe('Conversion state for async mode: "started", "processed", or "failed".')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyzineClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId
    });

    let options = {
      pdfUrl: ctx.input.sourceUrl,
      clientId: ctx.auth.clientId,
      title: ctx.input.title,
      subtitle: ctx.input.subtitle,
      description: ctx.input.description,
      templateFlipbookId: ctx.input.templateFlipbookId,
      logoUrl: ctx.input.logoUrl,
      backgroundColor: ctx.input.backgroundColor,
      downloadButton: ctx.input.downloadButton,
      fullscreen: ctx.input.fullscreen,
      share: ctx.input.share,
      navigationButtons: ctx.input.navigationButtons
    };

    let result = ctx.input.async
      ? await client.createFlipbookAsync(options)
      : await client.createFlipbookSync(options);

    let mode = ctx.input.async ? 'asynchronously' : 'synchronously';
    let stateMsg = result.state ? ` (state: **${result.state}**)` : '';

    return {
      output: {
        flipbookId: result.id,
        flipbookUrl: result.url,
        thumbnailUrl: result.thumbnail,
        pdfUrl: result.pdf,
        state: result.state
      },
      message: `Flipbook created ${mode}${stateMsg}. View it at: ${result.url}`
    };
  })
  .build();
