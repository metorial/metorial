import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let reversePhoneResultSchema = z.object({
  phone: z.string().optional().describe('The queried phone number'),
  firstName: z.string().optional().describe('First name associated with the phone'),
  lastName: z.string().optional().describe('Last name associated with the phone'),
  middleInitial: z.string().optional().describe('Middle initial'),
  suffix: z.string().optional().describe('Name suffix'),
  business: z.string().optional().describe('Business name if applicable'),
  address: z.string().optional().describe('Street address'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State'),
  zip: z.string().optional().describe('ZIP code'),
  zip4: z.string().optional().describe('ZIP+4 code'),
  addressType: z.string().optional().describe('Address type (e.g., "residential")'),
  gender: z.string().optional().describe('Gender (e.g., "M", "F")'),
  genderPercent: z.string().optional().describe('Gender confidence percentage'),
  dnc: z.string().optional().describe('Do-Not-Call status')
});

let mapResult = (raw: Record<string, string>) => ({
  phone: raw.phone,
  firstName: raw.firstname,
  lastName: raw.lastname,
  middleInitial: raw.m_initial,
  suffix: raw.suffix,
  business: raw.business,
  address: raw.address,
  city: raw.city,
  state: raw.state,
  zip: raw.zip,
  zip4: raw.zip4,
  addressType: raw.addrtype,
  gender: raw.gender,
  genderPercent: raw.gender_prcnt,
  dnc: raw.dnc
});

export let reversePhoneLookup = SlateTool.create(spec, {
  name: 'Reverse Phone Lookup',
  key: 'reverse_phone_lookup',
  description: `Find the name and address associated with phone numbers. Returns first name, last name, address, city, state, ZIP, gender, and Do-Not-Call status. Useful for identifying callers and enriching contact records from phone numbers.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      phones: z.array(z.string()).min(1).max(100).describe('Phone numbers to look up')
    })
  )
  .output(
    z.object({
      results: z
        .array(reversePhoneResultSchema)
        .describe('Contact information for each phone number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { phones } = ctx.input;

    let results: Record<string, string>[];

    if (phones.length === 1) {
      let result = await client.reversePhone(phones[0]!);
      results = [result];
    } else {
      results = await client.reversePhoneBatch(phones);
    }

    let mapped = results.map(mapResult);

    return {
      output: { results: mapped },
      message: `Looked up contact information for **${phones.length}** phone number(s).`
    };
  })
  .build();
