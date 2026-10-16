import { createApiServiceError, SlateTool } from 'slates';
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

    if (
      typeof result.status !== 'string' ||
      !['NEW', 'IN_PROGRESS', 'FINISHED', 'FAILED'].includes(result.status)
    ) {
      throw createApiServiceError(
        'ClickMeeting returned a PDF response without a valid generation status.'
      );
    }
    if (result.status === 'FINISHED') {
      if (
        typeof result.url !== 'string' ||
        !URL.canParse(result.url) ||
        !['http:', 'https:'].includes(new URL(result.url).protocol)
      ) {
        throw createApiServiceError(
          'ClickMeeting returned a finished PDF report without a valid download URL.'
        );
      }
      await ctx.addAttachment({ type: 'url', url: result.url, mimeType: 'application/pdf' });
    }

    return {
      output: { pdf: result },
      message: `PDF report for session **${ctx.input.sessionId}**: ${result.status}.`
    };
  })
  .build();
