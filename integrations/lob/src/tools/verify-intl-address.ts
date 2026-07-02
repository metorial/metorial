import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyInternationalAddress = SlateTool.create(spec, {
  name: 'Verify International Address',
  key: 'verify_international_address',
  description: `Verify an international address across 240+ countries and territories. Returns deliverability status, standardized components, and coverage level. Provide either structured address fields or a freeform address string along with the country code.`,
  instructions: [
    'The country field is required and must be an ISO 3166-1 alpha-2 code (e.g., "CA", "GB", "DE").'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      primaryLine: z.string().optional().describe('Primary address line'),
      secondaryLine: z.string().optional().describe('Secondary address line'),
      city: z.string().optional().describe('City name'),
      state: z.string().optional().describe('State or province'),
      postalCode: z.string().optional().describe('Postal code'),
      country: z.string().describe('Country code (ISO 3166-1 alpha-2, e.g., "CA", "GB")'),
      recipient: z.string().optional().describe('Intended recipient'),
      address: z
        .string()
        .optional()
        .describe('Freeform single-line address (alternative to structured fields)')
    })
  )
  .output(
    z.object({
      verificationId: z.string().optional().nullable().describe('Verification ID'),
      deliverability: z
        .string()
        .describe(
          'Deliverability status: deliverable, deliverable_missing_info, undeliverable, no_match'
        ),
      primaryLine: z.string().optional().nullable().describe('Standardized primary line'),
      secondaryLine: z.string().optional().nullable().describe('Standardized secondary line'),
      lastLine: z
        .string()
        .optional()
        .nullable()
        .describe('City, state/province, and postal code'),
      country: z.string().optional().nullable().describe('Country code'),
      components: z.any().optional().nullable().describe('Parsed address components'),
      object: z.string().optional().nullable().describe('Object type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.verifyInternationalAddress(ctx.input);
    return {
      output: {
        verificationId: result.id ?? null,
        deliverability: result.deliverability,
        primaryLine: result.primary_line ?? null,
        secondaryLine: result.secondary_line ?? null,
        lastLine: result.last_line ?? null,
        country: result.country ?? null,
        components: result.components ?? null,
        object: result.object ?? null
      },
      message: `International address deliverability: **${result.deliverability}**${result.primary_line ? `\nStandardized: ${result.primary_line}${result.last_line ? `, ${result.last_line}` : ''}` : ''}`
    };
  });
