import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyUSAddress = SlateTool.create(spec, {
  name: 'Verify US Address',
  key: 'verify_us_address',
  description: `Verify, correct, and standardize a US address using USPS CASS-certified data. Returns deliverability status, standardized components, DPV confirmation, and a Lob Confidence Score (0–100). Provide either structured address fields or a single freeform address string.`,
  instructions: [
    'Either provide structured fields (primaryLine, city, state, zipCode) or a single freeform address string.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      primaryLine: z
        .string()
        .optional()
        .describe('Primary address line (e.g., "185 Berry St")'),
      secondaryLine: z.string().optional().describe('Secondary line (e.g., "Suite 6100")'),
      city: z.string().optional().describe('City name'),
      state: z.string().optional().describe('State (2-letter code)'),
      zipCode: z.string().optional().describe('5 or 9 digit ZIP code'),
      recipient: z.string().optional().describe('Intended recipient at the address'),
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
          'Deliverability status: deliverable, deliverable_unnecessary_unit, deliverable_incorrect_unit, deliverable_missing_unit, undeliverable'
        ),
      primaryLine: z.string().optional().nullable().describe('Standardized primary line'),
      secondaryLine: z.string().optional().nullable().describe('Standardized secondary line'),
      urbanization: z.string().optional().nullable().describe('Urbanization (Puerto Rico)'),
      lastLine: z
        .string()
        .optional()
        .nullable()
        .describe('City, state, and ZIP in standard format'),
      components: z
        .any()
        .optional()
        .nullable()
        .describe('Parsed address components (city, state, ZIP, county, etc.)'),
      deliverabilityAnalysis: z
        .any()
        .optional()
        .nullable()
        .describe('Detailed DPV analysis (confirmation, CMRA, vacant, active, footnotes)'),
      lobConfidenceScore: z
        .number()
        .optional()
        .nullable()
        .describe('Lob confidence score (0-100)'),
      object: z.string().optional().nullable().describe('Object type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.verifyUSAddress(ctx.input);
    return {
      output: {
        verificationId: result.id ?? null,
        deliverability: result.deliverability,
        primaryLine: result.primary_line ?? null,
        secondaryLine: result.secondary_line ?? null,
        urbanization: result.urbanization ?? null,
        lastLine: result.last_line ?? null,
        components: result.components ?? null,
        deliverabilityAnalysis: result.deliverability_analysis ?? null,
        lobConfidenceScore: result.lob_confidence_score ?? null,
        object: result.object ?? null
      },
      message: `Address deliverability: **${result.deliverability}**${result.lob_confidence_score != null ? ` (confidence: ${result.lob_confidence_score}/100)` : ''}${result.primary_line ? `\nStandardized: ${result.primary_line}${result.last_line ? `, ${result.last_line}` : ''}` : ''}`
    };
  });

export let autocompleteUSAddress = SlateTool.create(spec, {
  name: 'Autocomplete US Address',
  key: 'autocomplete_us_address',
  description: `Get address suggestions as the user types. Provide a partial address prefix and receive matching US address suggestions. Useful for building address input forms.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      addressPrefix: z
        .string()
        .describe('Partial address string to autocomplete (at least 3 characters)'),
      city: z.string().optional().describe('Filter by city'),
      state: z.string().optional().describe('Filter by state (2-letter code)'),
      zipCode: z.string().optional().describe('Filter by ZIP code')
    })
  )
  .output(
    z.object({
      suggestions: z
        .array(
          z.object({
            primaryLine: z.string().describe('Primary address line'),
            city: z.string().describe('City'),
            state: z.string().describe('State'),
            zipCode: z.string().describe('ZIP code')
          })
        )
        .describe('List of address suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.autocompleteUSAddress(ctx.input);
    let suggestions = (result.suggestions || []).map((s: any) => ({
      primaryLine: s.primary_line,
      city: s.city,
      state: s.state,
      zipCode: s.zip_code
    }));
    return {
      output: { suggestions },
      message: `Found **${suggestions.length}** address suggestions`
    };
  });
