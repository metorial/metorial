import { SlateTool } from 'slates';
import { z } from 'zod';
import { GammaClient } from '../lib/client';
import { spec } from '../spec';

export let getGenerationStatusTool = SlateTool.create(spec, {
  name: 'Get Generation Status',
  key: 'get_generation_status',
  description: `Check the status of a content generation request and retrieve results when complete.
Returns the current status (pending, completed, or failed), the Gamma URL to view/edit the content, downloadable export (if requested), and credit usage information.`,
  instructions: [
    'Poll at ~5 second intervals until status is "completed" or "failed".',
    'If exportAs was used, the export URL may require one additional poll after status shows "completed".',
    'Export download links are temporary - download files promptly.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      generationId: z
        .string()
        .min(1)
        .describe('The generation ID returned from Generate Content or Generate from Template')
    })
  )
  .output(
    z.object({
      generationId: z.string().describe('The generation ID'),
      gammaId: z
        .string()
        .optional()
        .describe('Generated file ID for get_gamma and other management operations'),
      status: z.enum(['pending', 'completed', 'failed']).describe('Current generation status'),
      gammaUrl: z
        .string()
        .optional()
        .describe(
          'URL to view/edit the generated content in Gamma (available when completed)'
        ),
      exportUrl: z
        .string()
        .optional()
        .describe(
          'Legacy temporary export URL; treat it as a secret. The downloadable export is also returned when ready.'
        ),
      creditsDeducted: z
        .number()
        .optional()
        .describe('Number of credits used for this generation'),
      creditsRemaining: z.number().optional().describe('Remaining credits in the account'),
      errorMessage: z.string().optional().describe('Error message if generation failed'),
      errorStatusCode: z
        .number()
        .optional()
        .describe('Provider status code if generation failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GammaClient(ctx.auth.token);

    let result = await client.getGeneration(ctx.input.generationId);

    if (result.exportUrl) {
      await ctx.addAttachment({ type: 'url', url: result.exportUrl });
    }

    let output = {
      generationId: result.generationId,
      status: result.status,
      gammaId: result.gammaId ?? undefined,
      gammaUrl: result.gammaUrl ?? undefined,
      exportUrl: result.exportUrl ?? undefined,
      creditsDeducted: result.credits?.deducted,
      creditsRemaining: result.credits?.remaining,
      errorMessage: result.error?.message,
      errorStatusCode: result.error?.statusCode
    };

    let message = `Generation **${result.generationId}** status: **${result.status}**`;
    if (result.status === 'completed' && result.gammaUrl) {
      message += `\n\nView content: ${result.gammaUrl}`;
      if (result.exportUrl) {
        message += `\nThe export is ready to download. Download promptly; it expires after approximately one week.`;
      }
      if (result.credits) {
        message += `\n\nCredits used: ${result.credits.deducted} | Remaining: ${result.credits.remaining}`;
      }
    } else if (result.status === 'failed' && result.error) {
      message += `\n\nError: ${result.error.message}`;
    } else if (result.status === 'pending') {
      message += `\n\nGeneration is still in progress. Poll again in ~5 seconds.`;
    }

    return {
      output,
      message
    };
  });
