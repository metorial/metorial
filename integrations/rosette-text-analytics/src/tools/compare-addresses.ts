import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let structuredAddressSchema = z.object({
  houseNumber: z.string().optional().describe('House or building number'),
  road: z.string().optional().describe('Street or road name'),
  city: z.string().optional().describe('City name'),
  state: z.string().optional().describe('State or province'),
  postalCode: z.string().optional().describe('Postal or ZIP code'),
  country: z.string().optional().describe('Country name or code')
});

let addressSchema = z.union([
  z.string().describe('Unstructured address as a single string'),
  structuredAddressSchema.describe('Structured address with individual fields')
]);

export let compareAddressesTool = SlateTool.create(spec, {
  name: 'Compare Addresses',
  key: 'compare_addresses',
  description: `Compares two addresses to determine whether they refer to the same location. Accepts both structured addresses (with individual fields) and unstructured addresses (as plain text strings). Can mix structured and unstructured formats.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      address1: addressSchema.describe('The first address to compare'),
      address2: addressSchema.describe('The second address to compare')
    })
  )
  .output(
    z.object({
      score: z.number().describe('Similarity score between 0 (no match) and 1 (exact match)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.addressSimilarity(ctx.input.address1, ctx.input.address2);

    let score = result.score ?? 0;

    return {
      output: {
        score
      },
      message: `Address similarity score: **${(score * 100).toFixed(1)}%**.`
    };
  })
  .build();
