import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrUpdateLead = SlateTool.create(spec, {
  name: 'Create or Update Lead',
  key: 'create_or_update_lead',
  description: `Create a new lead or update an existing lead in a La Growth Machine audience. At least one identifier is required: professional email, personal email, LinkedIn URL, Twitter handle, or first name + last name with company name/URL.`,
  instructions: [
    'The audience must already exist in La Growth Machine before adding leads to it.',
    'By default only empty fields are updated. To overwrite existing fields, enable "Update existing contact with changed or new fields" in LGM Outreach Settings.'
  ]
})
  .input(
    z.object({
      audience: z
        .string()
        .describe(
          'Name of the LGM audience to add the lead to. Must already exist in La Growth Machine.'
        ),
      leadId: z.string().optional().describe('Existing LGM lead ID to update'),
      firstname: z.string().optional().describe('First name of the lead'),
      lastname: z.string().optional().describe('Last name of the lead'),
      proEmail: z.string().optional().describe('Professional email address'),
      persoEmail: z.string().optional().describe('Personal email address'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL'),
      twitter: z.string().optional().describe('Twitter/X handle'),
      phone: z.string().optional().describe('Phone number'),
      companyName: z.string().optional().describe('Company name'),
      companyUrl: z.string().optional().describe('Company website URL'),
      jobTitle: z.string().optional().describe('Job title'),
      location: z.string().optional().describe('Location'),
      industry: z.string().optional().describe('Industry'),
      gender: z.string().optional().describe('Gender'),
      bio: z.string().optional().describe('Bio or description'),
      profilePicture: z.string().optional().describe('Profile picture URL'),
      customAttribute1: z.string().optional().describe('Custom attribute 1'),
      customAttribute2: z.string().optional().describe('Custom attribute 2'),
      customAttribute3: z.string().optional().describe('Custom attribute 3'),
      customAttribute4: z.string().optional().describe('Custom attribute 4'),
      customAttribute5: z.string().optional().describe('Custom attribute 5'),
      customAttribute6: z.string().optional().describe('Custom attribute 6'),
      customAttribute7: z.string().optional().describe('Custom attribute 7'),
      customAttribute8: z.string().optional().describe('Custom attribute 8'),
      customAttribute9: z.string().optional().describe('Custom attribute 9'),
      customAttribute10: z.string().optional().describe('Custom attribute 10')
    })
  )
  .output(
    z.object({
      result: z.any().describe('The created or updated lead record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createOrUpdateLead({
      audience: ctx.input.audience,
      leadId: ctx.input.leadId,
      firstname: ctx.input.firstname,
      lastname: ctx.input.lastname,
      proEmail: ctx.input.proEmail,
      persoEmail: ctx.input.persoEmail,
      linkedinUrl: ctx.input.linkedinUrl,
      twitter: ctx.input.twitter,
      phone: ctx.input.phone,
      companyName: ctx.input.companyName,
      companyUrl: ctx.input.companyUrl,
      jobTitle: ctx.input.jobTitle,
      location: ctx.input.location,
      industry: ctx.input.industry,
      gender: ctx.input.gender,
      bio: ctx.input.bio,
      profilePicture: ctx.input.profilePicture,
      customAttribute1: ctx.input.customAttribute1,
      customAttribute2: ctx.input.customAttribute2,
      customAttribute3: ctx.input.customAttribute3,
      customAttribute4: ctx.input.customAttribute4,
      customAttribute5: ctx.input.customAttribute5,
      customAttribute6: ctx.input.customAttribute6,
      customAttribute7: ctx.input.customAttribute7,
      customAttribute8: ctx.input.customAttribute8,
      customAttribute9: ctx.input.customAttribute9,
      customAttribute10: ctx.input.customAttribute10
    });

    return {
      output: { result },
      message: `Lead successfully created or updated in audience **${ctx.input.audience}**.`
    };
  })
  .build();
