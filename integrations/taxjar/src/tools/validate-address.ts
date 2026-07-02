import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let validateAddress = SlateTool.create(spec, {
  name: 'Validate Address',
  key: 'validate_address',
  description: `Validate a US customer address and receive standardized address matches with ZIP+4 precision. Can return multiple candidate matches when the input is ambiguous.`,
  constraints: [
    'Only US addresses are supported.',
    'Requires a TaxJar Professional or higher subscription.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      country: z.string().optional().describe('Two-letter ISO country code (default: US)'),
      state: z.string().optional().describe('Two-letter state code'),
      zip: z.string().optional().describe('ZIP code (5-digit or ZIP+4)'),
      city: z.string().optional().describe('City name'),
      street: z.string().optional().describe('Street address')
    })
  )
  .output(
    z.object({
      addresses: z
        .array(
          z.object({
            zip: z.string().describe('Standardized ZIP+4 code'),
            state: z.string().describe('State code'),
            city: z.string().describe('City name'),
            street: z.string().describe('Standardized street address'),
            country: z.string().describe('Country code')
          })
        )
        .describe('Validated address candidates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let addresses = await client.validateAddress({
      country: ctx.input.country,
      state: ctx.input.state,
      zip: ctx.input.zip,
      city: ctx.input.city,
      street: ctx.input.street
    });

    return {
      output: { addresses },
      message:
        addresses.length === 1
          ? `Address validated: **${addresses[0]!.street}, ${addresses[0]!.city}, ${addresses[0]!.state} ${addresses[0]!.zip}**`
          : `Found **${addresses.length}** address candidate(s).`
    };
  })
  .build();
