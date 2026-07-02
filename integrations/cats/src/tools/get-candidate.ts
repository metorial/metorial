import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCandidate = SlateTool.create(spec, {
  name: 'Get Candidate',
  key: 'get_candidate',
  description: `Retrieve a single candidate record by ID. Returns full candidate details including contact info, address, employment, skills, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      candidateId: z.string().describe('ID of the candidate to retrieve')
    })
  )
  .output(
    z.object({
      candidateId: z.string().describe('Candidate ID'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      middleName: z.string().optional().describe('Middle name'),
      title: z.string().optional().describe('Professional title'),
      currentEmployer: z.string().optional().describe('Current employer'),
      keySkills: z.string().optional().describe('Key skills'),
      dateAvailable: z.string().optional().describe('Date available'),
      currentPay: z.string().optional().describe('Current pay'),
      desiredPay: z.string().optional().describe('Desired pay'),
      isWillingToRelocate: z.boolean().optional().describe('Willing to relocate'),
      isActive: z.boolean().optional().describe('Whether active'),
      isHot: z.boolean().optional().describe('Whether marked as hot'),
      notes: z.string().optional().describe('Notes'),
      source: z.string().optional().describe('Source'),
      website: z.string().optional().describe('Website'),
      countryCode: z.string().optional().describe('Country code'),
      createdAt: z.string().optional().describe('Created date'),
      updatedAt: z.string().optional().describe('Last updated date'),
      emails: z.array(z.any()).optional().describe('Email addresses'),
      phones: z.array(z.any()).optional().describe('Phone numbers'),
      address: z.any().optional().describe('Address'),
      socialMediaUrls: z.array(z.any()).optional().describe('Social media URLs'),
      links: z.any().optional().describe('HAL links for related resources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getCandidate(ctx.input.candidateId);

    return {
      output: {
        candidateId: (data.id ?? ctx.input.candidateId).toString(),
        firstName: data.first_name,
        lastName: data.last_name,
        middleName: data.middle_name,
        title: data.title,
        currentEmployer: data.current_employer,
        keySkills: data.key_skills,
        dateAvailable: data.date_available,
        currentPay: data.current_pay,
        desiredPay: data.desired_pay,
        isWillingToRelocate: data.is_willing_to_relocate,
        isActive: data.is_active,
        isHot: data.is_hot,
        notes: data.notes,
        source: data.source,
        website: data.website,
        countryCode: data.country_code,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        emails: data._embedded?.emails,
        phones: data._embedded?.phones,
        address: data._embedded?.address ?? data.address,
        socialMediaUrls: data.social_media_urls,
        links: data._links
      },
      message: `Retrieved candidate **${data.first_name ?? ''} ${data.last_name ?? ''}** (ID: ${ctx.input.candidateId}).`
    };
  })
  .build();
