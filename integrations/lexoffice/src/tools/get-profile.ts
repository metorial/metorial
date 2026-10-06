import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProfile = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description: `Retrieves the organization profile from Lexoffice, including organization identity, tax configuration, connection identity and available features. Useful for understanding the connected account's configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      connectionId: z.string().optional().describe('Current API connection ID'),
      created: z
        .object({
          userId: z.string().optional(),
          userName: z.string().optional(),
          userEmail: z.string().optional(),
          date: z.string().optional()
        })
        .optional()
        .describe('User and date associated with this API connection'),
      features: z.array(z.string()).optional().describe('Available features'),
      businessFeatures: z
        .array(z.string())
        .optional()
        .describe('Available business capabilities'),
      subscriptionStatus: z.string().optional().describe('Current subscription status'),
      distanceSalesPrinciple: z
        .string()
        .optional()
        .describe('Configured distance sales tax principle'),
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
    const profile = await new Client({ token: ctx.auth.token }).getProfile();
    return {
      output: profile,
      message: `Connected organization: **${profile.companyName}** (${profile.organizationId}).`
    };
  })
  .build();
