import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let renderDocument = SlateTool.create(spec, {
  name: 'Render Document',
  key: 'render_document',
  description: `Generate a document by merging data with a pre-uploaded template. Supports output formats including PDF, DOCX, ODT, TXT, HTML, and XHTML.
Documents can be delivered via email or stored to AWS S3 using the **storeTo** parameter, or returned directly by default.
Use **devMode** during development to get error highlights in the generated document instead of error codes.`,
  instructions: [
    'The templateName must reference a template already uploaded to Docmosis Cloud.',
    'The outputName determines the output format by its file extension (e.g., "report.pdf" generates a PDF).',
    'Use storeTo to control delivery: omit or set to "stream" for direct return, use "mailto:email@example.com" for email delivery, or "s3:bucketName,fileName" for S3 storage.',
    'Multiple storeTo targets can be combined with semicolons, e.g., "stream;mailto:user@example.com".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateName: z
        .string()
        .describe(
          'Path to the template in Docmosis Cloud (e.g., "/samples/WelcomeTemplate.docx")'
        ),
      outputName: z
        .string()
        .describe(
          'Output filename with extension that determines format (e.g., "output.pdf", "report.docx")'
        ),
      templateData: z
        .record(z.string(), z.any())
        .describe('Data object to merge with the template fields'),
      outputFormat: z
        .string()
        .optional()
        .describe(
          'Override output format (pdf, docx, odt, txt, html, xhtml). If omitted, determined by outputName extension.'
        ),
      storeTo: z
        .string()
        .optional()
        .describe(
          'Delivery method: "stream" (default), "mailto:email@example.com", "s3:bucket,filename", or combinations with semicolons'
        ),
      devMode: z
        .boolean()
        .optional()
        .describe(
          'When true, errors are highlighted in the document rather than returning error codes'
        ),
      strictParams: z
        .boolean()
        .optional()
        .describe('When true (default), strict parameter validation is enforced'),
      mailSubject: z
        .string()
        .optional()
        .describe('Email subject line when using mailto delivery'),
      mailBodyText: z
        .string()
        .optional()
        .describe('Email body text when using mailto delivery'),
      renderTag: z
        .string()
        .optional()
        .describe('Tag for usage tracking and reporting (e.g., "invoice;services")')
    })
  )
  .output(
    z.object({
      succeeded: z.boolean().describe('Whether the render operation succeeded'),
      pagesRendered: z
        .string()
        .optional()
        .describe('Number of pages in the generated document'),
      requestId: z.string().optional().describe('Unique identifier for this render request'),
      documentErrorsDetected: z
        .string()
        .optional()
        .describe('Whether errors were detected during rendering'),
      shortMsg: z.string().optional().describe('Short status message'),
      longMsg: z.string().optional().describe('Detailed status message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.render({
      templateName: ctx.input.templateName,
      outputName: ctx.input.outputName,
      data: ctx.input.templateData,
      outputFormat: ctx.input.outputFormat,
      storeTo: ctx.input.storeTo,
      devMode: ctx.input.devMode,
      strictParams: ctx.input.strictParams,
      mailSubject: ctx.input.mailSubject,
      mailBodyText: ctx.input.mailBodyText,
      renderTag: ctx.input.renderTag
    });

    let deliveryMethod = ctx.input.storeTo || 'stream';
    let message = result.succeeded
      ? `Successfully rendered **${ctx.input.outputName}** from template \`${ctx.input.templateName}\`. Pages: ${result.pagesRendered || 'N/A'}. Delivery: ${deliveryMethod}.`
      : `Render failed: ${result.shortMsg || result.longMsg || 'Unknown error'}`;

    return {
      output: {
        succeeded: result.succeeded ?? false,
        pagesRendered: result.pagesRendered,
        requestId: result.requestId,
        documentErrorsDetected: result.documentErrorsDetected,
        shortMsg: result.shortMsg,
        longMsg: result.longMsg
      },
      message
    };
  })
  .build();
