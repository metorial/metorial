import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let appendContactData = SlateTool.create(spec, {
  name: 'Append Contact Data',
  key: 'append_contact_data',
  description: `Enrich contact records by appending missing phone numbers or email addresses. Provide a person's name along with address or phone information, and the service will return the missing contact data. Use **appendType** "phone" to find phone numbers, or "email" to find email addresses.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      appendType: z
        .enum(['phone', 'email'])
        .describe(
          'Type of data to append: "phone" to find phone numbers, "email" to find email addresses'
        ),
      firstName: z.string().describe("Contact's first name"),
      lastName: z.string().describe("Contact's last name"),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State abbreviation'),
      zip: z.string().optional().describe('ZIP code'),
      phone: z
        .string()
        .optional()
        .describe('Phone number (used for email append when address is unavailable)')
    })
  )
  .output(
    z.object({
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phone: z.string().optional().describe('Appended phone number'),
      email: z.string().optional().describe('Appended email address'),
      address: z.string().optional().describe('Address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('ZIP code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { appendType, firstName, lastName, address, city, state, zip, phone } = ctx.input;

    let raw: Record<string, string>;

    if (appendType === 'phone') {
      raw = await client.phoneAppend({
        firstname: firstName,
        lastname: lastName,
        address,
        city,
        state,
        zip
      });
    } else {
      raw = await client.emailAppend({
        firstname: firstName,
        lastname: lastName,
        address,
        city,
        state,
        zip,
        phone
      });
    }

    let result = {
      firstName: raw.firstname,
      lastName: raw.lastname,
      phone: raw.phone,
      email: raw.email,
      address: raw.address,
      city: raw.city,
      state: raw.state,
      zip: raw.zip
    };

    return {
      output: result,
      message: `Appended **${appendType}** data for contact **${firstName} ${lastName}**.`
    };
  })
  .build();
