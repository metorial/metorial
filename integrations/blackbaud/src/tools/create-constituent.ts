import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z
  .object({
    type: z.string().describe('Address type (e.g., "Home", "Business").'),
    address_lines: z.string().optional().describe('Address lines.'),
    city: z.string().optional().describe('City.'),
    state: z.string().optional().describe('State or province.'),
    postal_code: z.string().optional().describe('Postal/ZIP code.'),
    country: z.string().optional().describe('Country.'),
    preferred: z.boolean().optional().describe('Whether this is the preferred address.')
  })
  .describe('An address to add to the constituent.');

let emailSchema = z
  .object({
    type: z.string().describe('Email type (e.g., "Email", "Personal").'),
    address: z.string().describe('Email address.'),
    primary: z.boolean().optional().describe('Whether this is the primary email.')
  })
  .describe('An email address to add to the constituent.');

let phoneSchema = z
  .object({
    type: z.string().describe('Phone type (e.g., "Home", "Mobile", "Business").'),
    number: z.string().describe('Phone number.'),
    primary: z.boolean().optional().describe('Whether this is the primary phone.')
  })
  .describe('A phone number to add to the constituent.');

export let createConstituent = SlateTool.create(spec, {
  name: 'Create Constituent',
  key: 'create_constituent',
  description: `Create a new constituent record. Supports creating individual or organization constituents with optional addresses, emails, and phones in a single operation.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      type: z
        .enum(['Individual', 'Organization'])
        .describe('Whether this is an individual or organization.'),
      firstName: z.string().optional().describe('First name (for individuals).'),
      lastName: z.string().optional().describe('Last name (for individuals).'),
      name: z.string().optional().describe('Organization name (for organizations).'),
      title: z.string().optional().describe('Title (e.g., Mr., Mrs., Dr.).'),
      suffix: z.string().optional().describe('Suffix (e.g., Jr., Sr., III).'),
      gender: z.string().optional().describe('Gender.'),
      birthdate: z.string().optional().describe('Birth date (YYYY-MM-DD).'),
      addresses: z.array(addressSchema).optional().describe('Addresses to add.'),
      emailAddresses: z.array(emailSchema).optional().describe('Email addresses to add.'),
      phones: z.array(phoneSchema).optional().describe('Phone numbers to add.')
    })
  )
  .output(
    z.object({
      constituentId: z.string().describe('System record ID of the newly created constituent.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let constituentData: Record<string, any> = {
      type: ctx.input.type
    };

    if (ctx.input.type === 'Individual') {
      if (ctx.input.firstName) constituentData.first = ctx.input.firstName;
      if (ctx.input.lastName) constituentData.last = ctx.input.lastName;
      if (ctx.input.title) constituentData.title = ctx.input.title;
      if (ctx.input.suffix) constituentData.suffix = ctx.input.suffix;
      if (ctx.input.gender) constituentData.gender = ctx.input.gender;
      if (ctx.input.birthdate) {
        let parts = ctx.input.birthdate.split('-');
        constituentData.birthdate = {
          y: Number.parseInt(parts[0] ?? '0', 10),
          m: Number.parseInt(parts[1] ?? '0', 10),
          d: Number.parseInt(parts[2] ?? '0', 10)
        };
      }
    } else if (ctx.input.name) constituentData.name = ctx.input.name;

    if (ctx.input.emailAddresses?.length) {
      constituentData.email = ctx.input.emailAddresses[0];
    }
    if (ctx.input.phones?.length) {
      constituentData.phone = ctx.input.phones[0];
    }
    if (ctx.input.addresses?.length) {
      constituentData.address = ctx.input.addresses[0];
    }

    let result = await client.createConstituent(constituentData);
    let constituentId = String(result?.id || result);

    // Add additional addresses, emails, phones beyond the first
    if (ctx.input.addresses && ctx.input.addresses.length > 1) {
      for (let i = 1; i < ctx.input.addresses.length; i++) {
        let addr = ctx.input.addresses[i];
        if (addr) await client.createConstituentAddress(constituentId, addr);
      }
    }
    if (ctx.input.emailAddresses && ctx.input.emailAddresses.length > 1) {
      for (let i = 1; i < ctx.input.emailAddresses.length; i++) {
        let email = ctx.input.emailAddresses[i];
        if (email) await client.createConstituentEmailAddress(constituentId, email);
      }
    }
    if (ctx.input.phones && ctx.input.phones.length > 1) {
      for (let i = 1; i < ctx.input.phones.length; i++) {
        let phone = ctx.input.phones[i];
        if (phone) await client.createConstituentPhone(constituentId, phone);
      }
    }

    let displayName =
      ctx.input.type === 'Individual'
        ? `${ctx.input.firstName || ''} ${ctx.input.lastName || ''}`.trim()
        : ctx.input.name || 'organization';

    return {
      output: { constituentId },
      message: `Created constituent **${displayName}** with ID ${constituentId}.`
    };
  })
  .build();
