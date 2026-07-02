import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaradayClient } from '../lib/client';
import { spec } from '../spec';

export let lookupPrediction = SlateTool.create(spec, {
  name: 'Lookup Prediction',
  key: 'lookup_prediction',
  description: `Perform a real-time lookup on a Lookup API target to retrieve predictions for an individual. Provide identity information (name, address, email, phone) and Faraday matches against its Identity Graph to return propensity scores, persona assignments, cohort membership, and enriched attributes.

Provide as many identity fields as possible to maximize match accuracy. The target must be of type \`lookup_api\` and in \`ready\` status.`,
  instructions: [
    'The target must be a Lookup API target in "ready" status.',
    'Match rates are highest when providing multiple identity fields (name + address + email is ideal).',
    'Use matchAlgorithm "tight" to require firstname match, or "loose" to match on address only.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      targetId: z.string().describe('UUID of the Lookup API target'),
      personFirstName: z.string().optional().describe('First name of the individual'),
      personLastName: z.string().optional().describe('Last name of the individual'),
      houseNumberAndStreet: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      postcode: z.string().optional().describe('Postal/ZIP code'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      matchAlgorithm: z
        .enum(['loose', 'tight'])
        .optional()
        .describe(
          'Match algorithm: "tight" requires firstname, "loose" ignores name and matches on address only'
        ),
      searchRadius: z
        .number()
        .optional()
        .describe('Limit distance for reverse geocoding match, in meters')
    })
  )
  .output(
    z.object({
      matched: z.boolean().describe('Whether a match was found in the Identity Graph'),
      matchType: z
        .string()
        .optional()
        .describe('Describes which identifiers were used to confirm the match'),
      predictions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Propensity scores, persona assignments, and other prediction data'),
      rawResponse: z.record(z.string(), z.any()).describe('Full response from the Lookup API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });

    let identity: Record<string, any> = {};
    if (ctx.input.personFirstName) identity.person_first_name = ctx.input.personFirstName;
    if (ctx.input.personLastName) identity.person_last_name = ctx.input.personLastName;
    if (ctx.input.houseNumberAndStreet)
      identity.house_number_and_street = ctx.input.houseNumberAndStreet;
    if (ctx.input.city) identity.city = ctx.input.city;
    if (ctx.input.state) identity.state = ctx.input.state;
    if (ctx.input.postcode) identity.postcode = ctx.input.postcode;
    if (ctx.input.email) identity.email = ctx.input.email;
    if (ctx.input.phone) identity.phone = ctx.input.phone;
    if (ctx.input.matchAlgorithm) identity.match_algorithm = ctx.input.matchAlgorithm;
    if (ctx.input.searchRadius !== undefined) identity.search_radius = ctx.input.searchRadius;

    let result = await client.lookupTarget(ctx.input.targetId, identity);

    let matched = !!result.match_type;
    let predictions: Record<string, any> = {};

    for (let [key, value] of Object.entries(result)) {
      if (key.startsWith('fdy_')) {
        predictions[key] = value;
      }
    }

    return {
      output: {
        matched,
        matchType: result.match_type,
        predictions: Object.keys(predictions).length > 0 ? predictions : undefined,
        rawResponse: result
      },
      message: matched
        ? `Match found via **${result.match_type}**. ${Object.keys(predictions).length} prediction field(s) returned.`
        : `No match found for the provided identity information.`
    };
  })
  .build();
