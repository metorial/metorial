import { SlateTool } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';

let identifierSchema = z
  .object({
    type: z.enum(['email', 'phone']).describe('Identifier type'),
    id: z.string().describe('The email address or phone number'),
    channels: z
      .object({
        email: z
          .object({
            status: z
              .enum(['subscribed', 'nonSubscribed', 'unsubscribed'])
              .describe('Email subscription status'),
            statusDate: z.string().optional().describe('ISO 8601 timestamp of status change')
          })
          .optional(),
        sms: z
          .object({
            status: z
              .enum(['subscribed', 'nonSubscribed', 'unsubscribed'])
              .describe('SMS subscription status'),
            statusDate: z.string().optional().describe('ISO 8601 timestamp of status change')
          })
          .optional()
      })
      .optional()
      .describe('Channel subscription statuses'),
    consent: z
      .object({
        source: z.string().optional().describe('Source of consent (e.g., "api", "import")'),
        createdAt: z.string().optional().describe('ISO 8601 timestamp of consent'),
        ip: z.string().optional().describe('IP address of user when consent was given'),
        userAgent: z.string().optional().describe('Browser user agent string')
      })
      .optional()
      .describe('Consent details for this identifier')
  })
  .describe('Contact identifier (email or phone)');

let contactOutputSchema = z.object({
  contactId: z.string().describe('Omnisend contact ID'),
  email: z.string().optional().describe('Contact email address'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  phone: z.array(z.string()).optional().describe('Phone numbers'),
  tags: z.array(z.string()).optional().describe('Contact tags'),
  country: z.string().optional().describe('Country'),
  countryCode: z.string().optional().describe('ISO country code'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State'),
  postalCode: z.string().optional().describe('Postal code'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

export let createContact = SlateTool.create(spec, {
  name: 'Create or Update Contact',
  key: 'create_contact',
  description: `Create a new contact in Omnisend or update an existing one if identifiers match. Supports setting email/SMS subscription statuses, custom properties, tags, and consent data. If a contact with the same email or phone already exists, it will be updated.`,
  instructions: [
    'Use identifiers to specify email and/or phone with their subscription statuses.',
    'Set sendWelcomeEmail to true to trigger the welcome automation workflow.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      identifiers: z
        .array(identifierSchema)
        .optional()
        .describe('Email and/or phone identifiers with subscription statuses'),
      email: z
        .string()
        .optional()
        .describe('Contact email (shorthand — creates an email identifier automatically)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phone: z.array(z.string()).optional().describe('Phone numbers'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      postalCode: z.string().optional().describe('Postal/zip code'),
      country: z.string().optional().describe('Country name'),
      countryCode: z.string().optional().describe('ISO country code (e.g., "US")'),
      birthdate: z.string().optional().describe('Birthdate in YYYY-MM-DD format'),
      gender: z.enum(['m', 'f']).optional().describe('"m" for male, "f" for female'),
      tags: z.array(z.string()).optional().describe('Tags for organizing contacts (max 100)'),
      customProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom key-value properties'),
      sendWelcomeEmail: z.boolean().optional().describe('Trigger welcome automation workflow')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth.token);

    let body: Record<string, any> = {};
    if (ctx.input.identifiers) body.identifiers = ctx.input.identifiers;
    if (ctx.input.email) body.email = ctx.input.email;
    if (ctx.input.firstName) body.firstName = ctx.input.firstName;
    if (ctx.input.lastName) body.lastName = ctx.input.lastName;
    if (ctx.input.phone) body.phone = ctx.input.phone;
    if (ctx.input.address) body.address = ctx.input.address;
    if (ctx.input.city) body.city = ctx.input.city;
    if (ctx.input.state) body.state = ctx.input.state;
    if (ctx.input.postalCode) body.postalCode = ctx.input.postalCode;
    if (ctx.input.country) body.country = ctx.input.country;
    if (ctx.input.countryCode) body.countryCode = ctx.input.countryCode;
    if (ctx.input.birthdate) body.birthdate = ctx.input.birthdate;
    if (ctx.input.gender) body.gender = ctx.input.gender;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.customProperties) body.customProperties = ctx.input.customProperties;
    if (ctx.input.sendWelcomeEmail !== undefined)
      body.sendWelcomeEmail = ctx.input.sendWelcomeEmail;

    let result = await client.createOrUpdateContact(body);

    return {
      output: {
        contactId: result.contactID,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        phone: result.phone,
        tags: result.tags,
        country: result.country,
        countryCode: result.countryCode,
        city: result.city,
        state: result.state,
        postalCode: result.postalCode,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Contact **${result.email || result.contactID}** created or updated successfully.`
    };
  })
  .build();
