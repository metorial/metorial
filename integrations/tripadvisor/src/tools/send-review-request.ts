import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReviewExpressClient } from '../lib/client';
import { spec } from '../spec';

let guestRequestSchema = z.object({
  locationId: z.string().describe('Tripadvisor location ID of the hotel'),
  partnerRequestId: z
    .string()
    .optional()
    .describe('Your own booking/reference ID for tracking'),
  recipient: z.string().describe('Guest email address'),
  checkin: z.string().optional().describe('Check-in date in ISO-8601 format (YYYY-MM-DD)'),
  checkout: z
    .string()
    .describe(
      'Check-out date in ISO-8601 format (YYYY-MM-DD). Email is sent 2 days after this date.'
    ),
  language: z
    .string()
    .optional()
    .describe('Language code for the review request email (e.g., "en", "fr")'),
  country: z
    .string()
    .describe('ISO 3166-1 alpha-2 country code of the guest (e.g., "US", "GB")')
});

let responseEntrySchema = z.object({
  requestId: z.number().describe('Tripadvisor email request ID'),
  partnerRequestId: z.string().optional(),
  status: z.string(),
  errors: z.array(z.any()).optional()
});

export let sendReviewRequest = SlateTool.create(spec, {
  name: 'Send Review Request',
  key: 'send_review_request',
  description: `Send review collection emails to recent hotel guests via Tripadvisor Review Express. Creates email requests that will be sent to guests after their check-out date, encouraging them to write a review. Supports batch requests (up to the 10,000 character body limit). Requires a Review Express API key and the hotel must be opted in to the program.`,
  instructions: [
    'The hotel must be opted in to Review Express. Use the Check Review Express Opt-In tool first to verify.',
    'Emails can be created from booking date up to 1 day after check-out.'
  ],
  constraints: [
    'Maximum 10,000 characters per request body.',
    'Hotels must be opted in to Review Express.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      guests: z.array(guestRequestSchema).describe('List of guest review requests to send')
    })
  )
  .output(
    z.object({
      results: z.array(responseEntrySchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReviewExpressClient({
      token: ctx.auth.token
    });

    let result = await client.createEmailRequest(
      ctx.input.guests.map(g => ({
        locationId: g.locationId,
        partnerRequestId: g.partnerRequestId,
        recipient: g.recipient,
        checkin: g.checkin,
        checkout: g.checkout,
        language: g.language,
        country: g.country
      }))
    );

    let results = (Array.isArray(result) ? result : [result]).map((r: any) => ({
      requestId: r.request_id,
      partnerRequestId: r.partner_request_id,
      status: r.status,
      errors: r.errors
    }));

    let successCount = results.filter(r => r.status === 'queued').length;

    return {
      output: { results },
      message: `Sent **${successCount}** review request(s) out of ${ctx.input.guests.length}. Status: ${results.map(r => `#${r.requestId}: ${r.status}`).join(', ')}.`
    };
  })
  .build();
