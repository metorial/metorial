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
  description: `Create a contact or update an existing matching email contact. Conflicting identifiers can be ignored by the provider. Subscription changes can activate automations. Tags append in v5 but replace the entire tag set in API version 2026-03-15; changing API version deliberately changes that behavior. Contact history cannot be erased through this integration.`,
  instructions: [
    'Use identifiers to specify email and/or phone with their subscription statuses.',
    'Welcome messaging is suppressed unless sendWelcomeEmail is explicitly true; other configured automations may still run.'
  ],
  tags: { destructive: true, readOnly: false }
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
      tags: z
        .array(z.string())
        .optional()
        .describe(
          'Contact tags (max 100): v5 appends; 2026-03-15 replaces the complete tag set'
        ),
      customProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom key-value properties'),
      sendWelcomeEmail: z.boolean().optional().describe('Trigger welcome automation workflow')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth, ctx.config.apiVersion);
    let output = await client.createOrUpdateContact(ctx.input);
    return {
      output,
      message:
        'Contact creation or update accepted. Subscription changes can activate workflows; no contact deletion is available here.'
    };
  })
  .build();
