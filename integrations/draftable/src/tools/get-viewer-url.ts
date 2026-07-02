import { SlateTool } from 'slates';
import { z } from 'zod';
import { generatePublicViewerUrl, generateSignedViewerUrl } from '../lib/signing';
import { spec } from '../spec';

let DEFAULT_BASE_URL = 'https://api.draftable.com/v1';

export let getViewerUrl = SlateTool.create(spec, {
  name: 'Get Viewer URL',
  key: 'get_viewer_url',
  description: `Generates a viewer URL for a comparison. For private comparisons, generates a signed URL with an expiry time. For public comparisons, generates a direct public URL. The viewer supports side-by-side and single-page (redline) views and can be embedded in an iframe.`,
  instructions: [
    'Use isPublic=true only for comparisons that were created with public visibility.',
    'The default signed URL validity is 30 minutes. Set validForMinutes for a custom duration.',
    'Set wait=true if the comparison may still be processing — the viewer will show a loading animation until ready.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      comparisonIdentifier: z.string().describe('Unique identifier of the comparison'),
      isPublic: z
        .boolean()
        .optional()
        .describe(
          'If true, generates a public viewer URL (no authentication required). Defaults to false (signed URL).'
        ),
      validForMinutes: z
        .number()
        .optional()
        .describe(
          'Number of minutes the signed URL should remain valid. Defaults to 30. Only applies to signed (non-public) URLs.'
        ),
      wait: z
        .boolean()
        .optional()
        .describe(
          'If true, the viewer will wait for the comparison to finish processing instead of showing an error.'
        )
    })
  )
  .output(
    z.object({
      viewerUrl: z.string().describe('The viewer URL for the comparison'),
      validUntil: z
        .string()
        .nullable()
        .describe('UTC ISO 8601 timestamp when the signed URL expires. Null for public URLs.')
    })
  )
  .handleInvocation(async ctx => {
    let baseUrl = ctx.config.baseUrl || DEFAULT_BASE_URL;

    if (ctx.input.isPublic) {
      let viewerUrl = generatePublicViewerUrl({
        baseUrl,
        accountId: ctx.auth.accountId,
        comparisonIdentifier: ctx.input.comparisonIdentifier,
        wait: ctx.input.wait
      });

      return {
        output: {
          viewerUrl,
          validUntil: null
        },
        message: `Generated **public** viewer URL for comparison **${ctx.input.comparisonIdentifier}**.`
      };
    }

    let result = generateSignedViewerUrl({
      baseUrl,
      accountId: ctx.auth.accountId,
      authToken: ctx.auth.token,
      comparisonIdentifier: ctx.input.comparisonIdentifier,
      validUntilMinutes: ctx.input.validForMinutes,
      wait: ctx.input.wait
    });

    return {
      output: {
        viewerUrl: result.viewerUrl,
        validUntil: result.validUntil
      },
      message: `Generated **signed** viewer URL for comparison **${ctx.input.comparisonIdentifier}**, valid until ${result.validUntil}.`
    };
  })
  .build();
