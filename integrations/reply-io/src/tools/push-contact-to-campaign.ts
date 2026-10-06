import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pushContactToCampaign = SlateTool.create(spec, {
  name: 'Push Contact to Campaign',
  key: 'push_contact_to_campaign',
  description: `Create or update a contact and immediately push them into a campaign. Also supports marking a contact as replied or finished for a campaign. Uses still-available but unsupported V1 actions (legacy:use scope). Marking replied or finished affects every campaign for that email; campaignId scoping is unsupported.`,
  instructions: [
    'Use "push" to add/update a contact and push to campaign.',
    'Use "markReplied" to mark a contact as having replied.',
    'Use "markFinished" to mark a contact as finished in a campaign.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['push', 'markReplied', 'markFinished']).describe('Action to perform'),
      email: z.string().describe('Contact email address'),
      campaignId: z
        .number()
        .optional()
        .describe('Campaign ID to push the contact into (required for "push")'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      company: z.string().optional().describe('Company name'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      country: z.string().optional().describe('Country'),
      title: z.string().optional().describe('Job title'),
      phone: z.string().optional().describe('Phone number'),
      linkedInProfile: z.string().optional().describe('LinkedIn profile URL'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.any()).describe('Operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let {
      action,
      email,
      campaignId,
      firstName,
      lastName,
      company,
      city,
      state,
      country,
      title,
      phone,
      linkedInProfile,
      customFields
    } = ctx.input;

    if (action === 'push') {
      if (!campaignId)
        throw createApiServiceError('campaignId is required to push a contact to a campaign');
      let data: Record<string, any> = { email, campaignId };
      if (firstName) data.firstName = firstName;
      if (lastName) data.lastName = lastName;
      if (company) data.company = company;
      if (city) data.city = city;
      if (state) data.state = state;
      if (country) data.country = country;
      if (title) data.title = title;
      if (phone) data.phone = phone;
      if (linkedInProfile) data.linkedInProfile = linkedInProfile;
      if (customFields)
        data.customFields = Object.entries(customFields).map(([key, value]) => ({
          key,
          value
        }));

      let result = await client.addAndPushToCampaign(data);
      return {
        output: { result },
        message: `Pushed contact **${email}** to campaign **${campaignId}**.`
      };
    }

    if (action === 'markReplied') {
      let result = await client.markAsReplied({ email, campaignId });
      return {
        output: { result },
        message: `Marked contact **${email}** as replied${campaignId ? ` in campaign **${campaignId}**` : ''}.`
      };
    }

    // markFinished
    let result = await client.markAsFinished({ email, campaignId });
    return {
      output: { result },
      message: `Marked contact **${email}** as finished${campaignId ? ` in campaign **${campaignId}**` : ''}.`
    };
  })
  .build();
