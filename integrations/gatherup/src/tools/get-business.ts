import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getBusiness = SlateTool.create(spec, {
  name: 'Get Business',
  key: 'get_business',
  description: `Retrieve detailed information about a specific business location, including address, contact info, engagement metrics (NPS, feedbacks received), communication settings, and branding URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      businessId: z.number().describe('The business ID to retrieve')
    })
  )
  .output(
    z.object({
      businessId: z.number().describe('Business identifier'),
      businessName: z.string().optional().describe('Business name'),
      businessPhone: z.string().optional().describe('Phone number'),
      businessCity: z.string().optional().describe('City'),
      businessState: z.string().optional().describe('State'),
      businessZip: z.string().optional().describe('Postal code'),
      businessCountry: z.string().optional().describe('Country'),
      businessStreetAddress: z.string().optional().describe('Street address'),
      businessType: z.string().optional().describe('Google business type'),
      organisationType: z.string().optional().describe('Organisation type'),
      websiteURL: z.string().optional().describe('Website URL'),
      timezone: z.string().optional().describe('Business timezone'),
      package: z.string().optional().describe('Subscription package'),
      shortFeedbackUrl: z.string().optional().describe('Short URL to the feedback form'),
      communicationMethod: z
        .string()
        .optional()
        .describe('Communication method (Automatic or Manual)'),
      communicationSendEmail: z
        .number()
        .optional()
        .describe('Daily email volume in automatic mode'),
      nps: z.number().optional().describe('Lifetime Net Promoter Score'),
      feedbacksReceived: z.number().optional().describe('Total feedbacks received'),
      customersNotSent: z
        .number()
        .optional()
        .describe('Customers not yet sent feedback requests'),
      added: z.string().optional().describe('Date the business was added')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getBusiness(ctx.input.businessId);

    return {
      output: {
        businessId: data.id ?? ctx.input.businessId,
        businessName: data.name,
        businessPhone: data.phone,
        businessCity: data.city,
        businessState: data.state,
        businessZip: data.zip,
        businessCountry: data.country,
        businessStreetAddress: data.streetAddress,
        businessType: data.type,
        organisationType: data.organisationType,
        websiteURL: data.websiteURL,
        timezone: data.timezone,
        package: data.package,
        shortFeedbackUrl: data.shortFeedbackUrl,
        communicationMethod: data.communicationMethod,
        communicationSendEmail: data.communicationSendEmail,
        nps: data.nps,
        feedbacksReceived: data.feedbacksReceived,
        customersNotSent: data.customersNotSent,
        added: data.added
      },
      message: `Retrieved business **${data.name ?? ctx.input.businessId}**.`
    };
  })
  .build();
