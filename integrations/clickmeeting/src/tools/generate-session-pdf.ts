import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateSessionPdf = SlateTool.create(spec, {
  name: 'Generate Session PDF',
  key: 'generate_session_pdf',
  description: `Generates a PDF report for a specific session of a conference room. The report can be generated in different languages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      roomId: z.string().describe('ID of the conference room'),
      sessionId: z.string().describe('ID of the session'),
      language: z
        .string()
        .default('en')
        .describe('Language code for the PDF report (e.g. "en", "de", "pl")')
    })
  )
  .output(
    z.object({
      pdf: z
        .record(z.string(), z.unknown())
        .describe('PDF generation result with download URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.generateSessionPdf(
      ctx.input.roomId,
      ctx.input.sessionId,
      ctx.input.language
    );

    return {
      output: { pdf: result },
      message: `Generated PDF report for session **${ctx.input.sessionId}** in ${ctx.input.language}.`
    };
  })
  .build();
