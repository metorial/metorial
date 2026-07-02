import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generatePdf = SlateTool.create(spec, {
  name: 'Generate PDF',
  key: 'generate_pdf',
  description: `Convert a web page or HTML content into a PDF document. Supports custom page formats and navigation options.`
})
  .input(
    z.object({
      url: z
        .string()
        .optional()
        .describe('URL of the web page to convert. Provide either url or html.'),
      html: z
        .string()
        .optional()
        .describe('Raw HTML content to convert. Provide either url or html.'),
      format: z
        .string()
        .optional()
        .describe('PDF page format, e.g. "A4", "Letter". Defaults to "A4".'),
      timeout: z
        .number()
        .optional()
        .describe('Navigation timeout in milliseconds. Defaults to 30000.'),
      waitUntil: z
        .string()
        .optional()
        .describe(
          'When to consider navigation complete: "load", "domcontentloaded", "networkidle0", or "networkidle2".'
        )
    })
  )
  .output(
    z.object({
      pdfData: z.any().describe('PDF response data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generatePdf({
      url: ctx.input.url,
      html: ctx.input.html,
      gotoOptions: {
        timeout: ctx.input.timeout,
        waitUntil: ctx.input.waitUntil
      },
      options: {
        format: ctx.input.format
      }
    });

    return {
      output: {
        pdfData: result
      },
      message: `Generated PDF from ${ctx.input.url ? `**${ctx.input.url}**` : 'provided HTML content'}.`
    };
  })
  .build();
