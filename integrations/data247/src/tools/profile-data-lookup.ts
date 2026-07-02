import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let profileDataLookup = SlateTool.create(spec, {
  name: 'Profile Data Lookup',
  key: 'profile_data_lookup',
  description: `Get additional demographic and lifestyle information about a person, including financial data, interests, and household information. Provide the person's name and address to receive enriched profile data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      firstName: z.string().describe('First name of the person'),
      lastName: z.string().describe('Last name of the person'),
      address: z.string().describe('Street address'),
      city: z.string().describe('City'),
      state: z.string().describe('State abbreviation'),
      zip: z.string().describe('ZIP code')
    })
  )
  .output(
    z.object({
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('ZIP code'),
      profileAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Additional profile attributes including financial, interests, and household data'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { firstName, lastName, address, city, state, zip } = ctx.input;

    let raw = await client.profileData({
      firstname: firstName,
      lastname: lastName,
      address,
      city,
      state,
      zip
    });

    let { firstname, lastname, address: addr, city: c, state: s, zip: z2, ...rest } = raw;

    let result = {
      firstName: firstname,
      lastName: lastname,
      address: addr,
      city: c,
      state: s,
      zip: z2,
      profileAttributes: Object.keys(rest).length > 0 ? rest : undefined
    };

    return {
      output: result,
      message: `Retrieved profile data for **${firstName} ${lastName}**.`
    };
  })
  .build();
