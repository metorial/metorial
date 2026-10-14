import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let parseAddress = SlateTool.create(spec, {
  name: 'Parse Address',
  key: 'parse_address',
  description:
    'Split a freeform postal address into components such as house number, street, city, state, postal code, and unit. Parsing does not establish deliverability; use address verification for that.',
  tags: { readOnly: true }
})
  .input(z.object({ address: z.string().min(1).describe('Freeform address to parse') }))
  .output(
    z.object({
      category: z.string().optional().describe('Location category'),
      city: z.string().optional().describe('City'),
      cityDistrict: z.string().optional().describe('City district or borough'),
      country: z.string().optional().describe('Country'),
      house: z.string().optional().describe('House or location name'),
      houseNumber: z.string().optional().describe('House or street number'),
      island: z.string().optional().describe('Island'),
      level: z.string().optional().describe('Floor'),
      near: z.string().optional().describe('Near or in qualifier'),
      poBox: z.string().optional().describe('Post office box'),
      postcode: z.string().optional().describe('Postal or ZIP code'),
      road: z.string().optional().describe('Street name'),
      state: z.string().optional().describe('State or province'),
      stateDistrict: z.string().optional().describe('County or state district'),
      suburb: z.string().optional().describe('Neighborhood'),
      unit: z.string().optional().describe('Unit, apartment, or office')
    })
  )
  .handleInvocation(async ctx => ({
    output: await new Client({ token: ctx.auth.token }).parseAddress(ctx.input.address),
    message: 'Parsed the address into postal components.'
  }))
  .build();
