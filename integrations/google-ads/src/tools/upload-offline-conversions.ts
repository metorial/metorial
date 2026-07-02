import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { googleAdsActionScopes } from '../scopes';
import { spec } from '../spec';

export let uploadOfflineConversions = SlateTool.create(spec, {
  name: 'Upload Offline Conversions',
  key: 'upload_offline_conversions',
  description: `Upload offline click conversions to Google Ads. Imports real-world transaction data like in-store purchases, qualified phone leads, or CRM events to measure full-funnel conversion impact.

Each conversion requires a Google Click ID (gclid) to link the offline event back to the original ad click.`,
  instructions: [
    'The gclid is captured when a user clicks on an ad and visits your site. Store it for later upload.',
    'Conversion date/time should be in the format "yyyy-mm-dd hh:mm:ss+|-hh:mm" (e.g., "2024-01-15 14:30:00-05:00").',
    'The conversion action resource name must match an existing conversion action in the account.',
    'Conversions can take up to 3 hours to appear in Google Ads reporting.'
  ],
  constraints: [
    'Click conversions must be uploaded within 90 days of the click.',
    'Duplicate conversions (same gclid + conversion action + conversion date) are rejected.'
  ]
})
  .scopes(googleAdsActionScopes.uploadOfflineConversions)
  .input(
    z.object({
      customerId: z.string().describe('The Google Ads customer account ID'),
      conversions: z
        .array(
          z.object({
            gclid: z.string().describe('Google Click ID from the original ad click'),
            conversionAction: z
              .string()
              .describe(
                'Conversion action resource name (e.g., customers/{id}/conversionActions/{id})'
              ),
            conversionDateTime: z
              .string()
              .describe('When the conversion occurred, e.g., "2024-01-15 14:30:00-05:00"'),
            conversionValue: z
              .number()
              .optional()
              .describe('Monetary value of the conversion'),
            currencyCode: z
              .string()
              .optional()
              .describe('Currency code for the conversion value (e.g., USD)'),
            orderId: z
              .string()
              .optional()
              .describe('Unique order/transaction ID for deduplication')
          })
        )
        .describe('List of conversions to upload'),
      partialFailure: z
        .boolean()
        .optional()
        .describe('If true, valid conversions are uploaded even if some fail (default: true)')
    })
  )
  .output(
    z.object({
      uploadResults: z.any().describe('Results for each uploaded conversion'),
      partialFailureError: z.any().optional().describe('Details of any partial failures')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let conversions = ctx.input.conversions.map(c => ({
      gclid: c.gclid,
      conversionAction: c.conversionAction,
      conversionDateTime: c.conversionDateTime,
      conversionValue: c.conversionValue,
      currencyCode: c.currencyCode,
      orderId: c.orderId
    }));

    let result = await client.uploadClickConversions(
      ctx.input.customerId,
      conversions,
      ctx.input.partialFailure
    );

    return {
      output: {
        uploadResults: result.results || result,
        partialFailureError: result.partialFailureError
      },
      message: `Uploaded **${conversions.length}** offline conversion(s).${result.partialFailureError ? ' Some conversions had errors.' : ''}`
    };
  })
  .build();
