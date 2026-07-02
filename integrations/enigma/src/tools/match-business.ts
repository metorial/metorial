import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z
  .object({
    streetAddress1: z.string().optional().describe('Street address line 1'),
    streetAddress2: z.string().optional().describe('Street address line 2'),
    city: z.string().optional().describe('City'),
    state: z.string().optional().describe('Two-letter state code (e.g., NY, CA)'),
    postalCode: z.string().optional().describe('ZIP or postal code')
  })
  .describe('Business address');

let personSchema = z
  .object({
    firstName: z
      .string()
      .optional()
      .describe('First name of a person associated with the business'),
    lastName: z
      .string()
      .optional()
      .describe('Last name of a person associated with the business')
  })
  .describe('Person associated with the business');

let matchResultSchema = z.object({
  enigmaId: z
    .string()
    .optional()
    .describe('Unique Enigma identifier for the matched business'),
  matchConfidence: z.number().optional().describe('Confidence score between 0 and 1'),
  isMatched: z
    .boolean()
    .optional()
    .describe('Whether the match confidence exceeds the threshold'),
  matchedFields: z.any().optional().describe("Fields that matched in Enigma's database"),
  businessLocationEnigmaIds: z
    .array(z.string())
    .optional()
    .describe('Associated business location Enigma IDs'),
  names: z.any().optional().describe('Business names'),
  addresses: z.any().optional().describe('Business addresses'),
  websites: z.any().optional().describe('Business websites')
});

export let matchBusiness = SlateTool.create(spec, {
  name: 'Match Business',
  key: 'match_business',
  description: `Search for and identify a business in Enigma's database by providing identifying information such as name, address, website, or an associated person. Returns potential matches with confidence scores and Enigma IDs that can be used for further lookups.

Use this to find the Enigma ID for a business when you have partial identifying information. Supports matching by website URL alone, or combinations of name, address, and person information.`,
  instructions: [
    'Provide at least one of: website, name + address, name + person, or person + address.',
    'When matching by website alone, other fields are ignored if the website match succeeds.',
    'Lower the matchThreshold (e.g., 0.2-0.35) when providing incomplete address information (e.g., city and state but no street address).'
  ],
  constraints: [
    'Website-based matching is only available for entity type "business", not "business_location".',
    'Enigma IDs are not persistent over time and may change.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Business name (legal or operating/DBA name)'),
      website: z.string().optional().describe('Business website URL'),
      address: addressSchema.optional(),
      person: personSchema.optional(),
      entityType: z
        .enum(['business', 'business_location'])
        .default('business')
        .describe(
          'Type of entity to match: "business" for the overall business or "business_location" for a specific location'
        ),
      matchThreshold: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Minimum confidence score (0-1) to consider a match. Default is 0.5.'),
      topN: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Maximum number of matches to return. Default is 1.'),
      showNonMatches: z
        .boolean()
        .optional()
        .describe(
          'If true, returns non-matching results when no results exceed the threshold'
        ),
      prioritizeRevenue: z
        .boolean()
        .optional()
        .describe('If true, prioritizes results that have merchant transaction revenue data')
    })
  )
  .output(
    z.object({
      matches: z.array(matchResultSchema).describe('List of matched business profiles'),
      totalMatches: z.number().describe('Number of matches returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.matchBusiness(
      {
        name: ctx.input.name,
        website: ctx.input.website,
        address: ctx.input.address,
        person: ctx.input.person
      },
      {
        entityType: ctx.input.entityType,
        matchThreshold: ctx.input.matchThreshold,
        topN: ctx.input.topN,
        showNonMatches: ctx.input.showNonMatches,
        prioritization: ctx.input.prioritizeRevenue ? 'MTX' : undefined
      }
    );

    let matches: Record<string, unknown>[] = [];

    if (Array.isArray(result)) {
      matches = result.map((m: Record<string, unknown>) => ({
        enigmaId: m.enigma_id,
        matchConfidence: m.match_confidence,
        isMatched: m.is_matched,
        matchedFields: m.matched_fields,
        businessLocationEnigmaIds: m.business_location_enigma_ids,
        names: m.names,
        addresses: m.addresses,
        websites: m.websites
      }));
    } else if (result && typeof result === 'object') {
      matches = [
        {
          enigmaId: result.enigma_id,
          matchConfidence: result.match_confidence,
          isMatched: result.is_matched,
          matchedFields: result.matched_fields,
          businessLocationEnigmaIds: result.business_location_enigma_ids,
          names: result.names,
          addresses: result.addresses,
          websites: result.websites
        }
      ];
    }

    let matchedCount = matches.filter(m => m.isMatched).length;
    let topMatch = matches[0];
    let summary =
      matchedCount > 0
        ? `Found **${matchedCount}** match(es). Top match: Enigma ID \`${topMatch?.enigmaId}\` with confidence **${topMatch?.matchConfidence}**.`
        : `No matches found above the confidence threshold.`;

    return {
      output: {
        matches,
        totalMatches: matches.length
      },
      message: summary
    };
  })
  .build();
