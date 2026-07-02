import { SlateTool } from 'slates';
import { z } from 'zod';
import { AscoraClient } from '../lib/client';
import { spec } from '../spec';

export let submitEnquiry = SlateTool.create(spec, {
  name: 'Submit Enquiry',
  key: 'submit_enquiry',
  description: `Creates a new enquiry in Ascora from external data such as website contact forms or CRM systems. The enquiry can later be converted into a Quote or Job within Ascora.

Supports contact details, address information, a description of the enquiry, and any number of custom fields configured in your Ascora account.`,
  instructions: [
    'Custom field names must match the field names configured in your Ascora account under Administration settings.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companyName: z.string().optional().describe('Company or business name of the enquirer'),
      firstName: z.string().optional().describe('First name of the contact person'),
      lastName: z.string().optional().describe('Last name of the contact person'),
      email: z.string().optional().describe('Email address of the contact person'),
      mobile: z.string().optional().describe('Mobile phone number'),
      phone: z.string().optional().describe('Landline phone number'),
      addressLine1: z.string().optional().describe('Street address line 1'),
      addressLine2: z.string().optional().describe('Street address line 2'),
      addressSuburb: z.string().optional().describe('Suburb or city'),
      addressState: z.string().optional().describe('State or territory'),
      addressPostcode: z.string().optional().describe('Postal code'),
      addressCountry: z.string().optional().describe('Country'),
      enquiryDescription: z
        .string()
        .optional()
        .describe('Description of the enquiry or service request'),
      customFields: z
        .array(
          z.object({
            fieldName: z.string().describe('Name of the custom field as configured in Ascora'),
            fieldValue: z.string().describe('Value for the custom field')
          })
        )
        .optional()
        .describe('Custom fields for capturing additional business-specific data')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the enquiry was submitted successfully'),
      response: z.any().optional().describe('Response data from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AscoraClient({ token: ctx.auth.token });

    let result = await client.submitEnquiry({
      companyName: ctx.input.companyName,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      mobile: ctx.input.mobile,
      phone: ctx.input.phone,
      addressLine1: ctx.input.addressLine1,
      addressLine2: ctx.input.addressLine2,
      addressSuburb: ctx.input.addressSuburb,
      addressState: ctx.input.addressState,
      addressPostcode: ctx.input.addressPostcode,
      addressCountry: ctx.input.addressCountry,
      enquiryDescription: ctx.input.enquiryDescription,
      customFields: ctx.input.customFields
    });

    let contactName =
      [ctx.input.firstName, ctx.input.lastName].filter(Boolean).join(' ') ||
      ctx.input.companyName ||
      'Unknown';

    return {
      output: {
        success: true,
        response: result
      },
      message: `Successfully submitted enquiry for **${contactName}**${ctx.input.enquiryDescription ? `: "${ctx.input.enquiryDescription.substring(0, 100)}${ctx.input.enquiryDescription.length > 100 ? '...' : ''}"` : ''}.`
    };
  })
  .build();
