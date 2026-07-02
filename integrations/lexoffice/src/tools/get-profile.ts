import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProfile = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description: `Retrieves the organization profile from Lexoffice, including company name, tax information, address, and contact details. Useful for understanding the connected account's configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizationId: z.string().optional().describe('Unique organization ID'),
      companyName: z.string().optional().describe('Company name'),
      businessName: z.string().optional().describe('Business name'),
      taxType: z.string().optional().describe('Tax type (e.g. net, gross, vatfree)'),
      taxNumber: z.string().optional().describe('Tax number'),
      vatRegistrationId: z.string().optional().describe('VAT registration ID'),
      smallBusiness: z
        .boolean()
        .optional()
        .describe('Whether the organization is a small business (Kleinunternehmer)'),
      street: z.string().optional().describe('Street address'),
      zip: z.string().optional().describe('Postal code'),
      city: z.string().optional().describe('City'),
      countryCode: z.string().optional().describe('Country code'),
      contactEmail: z.string().optional().describe('Contact email address'),
      contactPhone: z.string().optional().describe('Contact phone number'),
      createdDate: z.string().optional().describe('Organization creation date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let profile = await client.getProfile();

    let address = profile.address || {};
    let contactDetails = profile.contactDetails || {};

    let output = {
      organizationId: profile.organizationId,
      companyName: profile.companyName,
      businessName: profile.businessName,
      taxType: profile.taxType,
      taxNumber: profile.taxNumber,
      vatRegistrationId: profile.vatRegistrationId,
      smallBusiness: profile.smallBusiness,
      street: address.street,
      zip: address.zip,
      city: address.city,
      countryCode: address.countryCode,
      contactEmail: contactDetails.email,
      contactPhone: contactDetails.phone,
      createdDate: profile.createdDate
    };

    let displayName = output.companyName || output.businessName || 'Unknown';

    return {
      output,
      message: `Organization: **${displayName}**${output.city ? `, ${output.city}` : ''}${output.countryCode ? ` (${output.countryCode})` : ''}${output.smallBusiness ? ' — Kleinunternehmer' : ''}.`
    };
  })
  .build();
