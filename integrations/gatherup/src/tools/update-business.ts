import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateBusiness = SlateTool.create(spec, {
  name: 'Update Business',
  key: 'update_business',
  description: `Update an existing business location's properties including name, address, contact info, branding images, communication settings, and feedback thresholds. Only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      businessId: z.number().describe('ID of the business to update'),
      businessName: z.string().optional().describe('Updated business name'),
      businessType: z.string().optional().describe('Google business type'),
      streetAddress: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('Postal code'),
      country: z.string().optional().describe('Country'),
      phone: z.string().optional().describe('Phone number'),
      websiteUrl: z.string().optional().describe('Website URL'),
      organisationType: z.string().optional().describe('Organisation type'),
      language: z.string().optional().describe('Language code (2-letter)'),
      customField: z.string().optional().describe('Custom identifier'),
      emailLogo: z.string().optional().describe('Logo image URL (max 260px width)'),
      feedbackBanner: z
        .string()
        .optional()
        .describe('Feedback page banner URL (min 760px width)'),
      emailImage: z.string().optional().describe('Email image URL (ideal 160x160px)'),
      automatedEmailsPerDay: z
        .number()
        .optional()
        .describe('Emails per day in automatic mode (0 = manual)'),
      feedbackThreshold: z.number().optional().describe('NPS threshold for widget display'),
      pageThreshold: z
        .number()
        .optional()
        .describe('NPS threshold for positive/negative feedback routing')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.updateBusiness(ctx.input);

    if (data.errorCode !== 0) {
      throw new Error(
        `Failed to update business: ${data.errorMessage} (code: ${data.errorCode})`
      );
    }

    return {
      output: { success: true },
      message: `Updated business **${ctx.input.businessId}** successfully.`
    };
  })
  .build();
