import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createBusiness = SlateTool.create(spec, {
  name: 'Create Business',
  key: 'create_business',
  description: `Create a new business location in GatherUp. Requires business name, type, full address, and phone number. Optionally creates a business owner/manager account.`,
  instructions: [
    'Use the "List Business Types" tool to find valid business type values.',
    'Organisation type must be one of: company, corporation, non profit, school, office, practice, agency, church, restaurant, event, firm, store, dealership.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      businessName: z.string().describe('Name of the business'),
      businessType: z.string().describe('Google business type (e.g., "Insurance Agency")'),
      streetAddress: z.string().describe('Physical street address'),
      city: z.string().describe('City'),
      state: z.string().describe('State code or full name'),
      zip: z.string().describe('Postal code'),
      country: z.string().describe('Country code or full name'),
      phone: z.string().describe('Phone number'),
      websiteUrl: z.string().optional().describe('Business website URL'),
      organisationType: z
        .string()
        .optional()
        .describe(
          'Type: company, corporation, non profit, school, office, practice, agency, church, restaurant, event, firm, store, dealership'
        ),
      language: z
        .string()
        .optional()
        .describe('Language code (de, en, es, fr, nl, no, pl, pt, sv, it)'),
      customField: z
        .string()
        .optional()
        .describe('Custom identifier for whitelabeled accounts'),
      createOwnerAccount: z
        .boolean()
        .optional()
        .describe('Whether to create a business owner/manager account'),
      ownerEmail: z
        .string()
        .optional()
        .describe('Email for the business owner (required if createOwnerAccount is true)'),
      ownerFirstName: z.string().optional().describe('First name of the business owner'),
      ownerLastName: z.string().optional().describe('Last name of the business owner'),
      sendOwnerPasswordEmail: z
        .boolean()
        .optional()
        .describe('Whether to send a password email to the owner')
    })
  )
  .output(
    z.object({
      businessId: z.number().describe('ID of the created business'),
      ownerPassword: z
        .string()
        .optional()
        .describe(
          'Generated password for the business owner (only if owner account was created)'
        ),
      businessManagerId: z.number().optional().describe('Manager ID if owner already existed')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.createBusiness({
      businessName: ctx.input.businessName,
      businessType: ctx.input.businessType,
      streetAddress: ctx.input.streetAddress,
      city: ctx.input.city,
      state: ctx.input.state,
      zip: ctx.input.zip,
      country: ctx.input.country,
      phone: ctx.input.phone,
      websiteUrl: ctx.input.websiteUrl,
      organisationType: ctx.input.organisationType,
      language: ctx.input.language,
      customField: ctx.input.customField,
      businessOwnerAccount: ctx.input.createOwnerAccount ? 1 : 0,
      businessOwnerEmail: ctx.input.ownerEmail,
      businessOwnerFirstName: ctx.input.ownerFirstName,
      businessOwnerLastName: ctx.input.ownerLastName,
      businessOwnerSendPasswordEmail: ctx.input.sendOwnerPasswordEmail ? 1 : 0
    });

    if (data.errorCode !== 0) {
      throw new Error(
        `Failed to create business: ${data.errorMessage} (code: ${data.errorCode})`
      );
    }

    return {
      output: {
        businessId: data.businessId,
        ownerPassword: data.businessOwnerPassword,
        businessManagerId: data.businessManagerId
      },
      message: `Created business **${ctx.input.businessName}** with ID **${data.businessId}**.`
    };
  })
  .build();
