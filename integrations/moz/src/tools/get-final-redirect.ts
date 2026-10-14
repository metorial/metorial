import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MozClient } from '../lib/client';
import { spec } from '../spec';

export let getFinalRedirectTool = SlateTool.create(spec, {
  name: 'Get Final Redirect',
  key: 'get_final_redirect',
  description:
    'Find the final redirect destination recorded in the Moz link index for a page. Useful for checking domain migrations and moved pages; this reflects indexed data rather than a live HTTP check.',
  tags: { readOnly: true }
})
  .input(z.object({ target: z.string().min(1).describe('Page URL to check') }))
  .output(
    z.object({
      target: z.string().describe('Requested page'),
      query: z.string().optional().describe('Canonical page query used by Moz'),
      destination: z
        .string()
        .nullable()
        .describe('Final indexed redirect destination, or null when no redirect exists')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new MozClient({ token: ctx.auth.token }).getFinalRedirect(
      ctx.input.target
    );
    if (result.destination !== null && typeof result.destination !== 'string') {
      throw createApiServiceError('Moz returned no redirect status for this page.');
    }
    return {
      output: {
        target: ctx.input.target,
        query: result.site_query?.query,
        destination: result.destination
      },
      message: result.destination
        ? `Final redirect: ${result.destination}.`
        : 'No redirect is recorded for this page.'
    };
  })
  .build();
