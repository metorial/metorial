import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requiredId } from '../lib/response';
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
      raw: z.any().optional().describe('Complete provider response, retaining null values'),
      links: z.any().optional().describe('HAL links for related resources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getCandidate(ctx.input.candidateId);

    return {
      output: {
        candidateId: requiredId(data?.id, 'record'),
        firstName: data.first_name ?? undefined,
        lastName: data.last_name ?? undefined,
        middleName: data.middle_name ?? undefined,
        title: data.title ?? undefined,
        currentEmployer: data.current_employer ?? undefined,
        keySkills: data.key_skills ?? undefined,
        dateAvailable: data.date_available ?? undefined,
        currentPay: data.current_pay ?? undefined,
        desiredPay: data.desired_pay ?? undefined,
        isWillingToRelocate: data.is_willing_to_relocate ?? undefined,
        isActive: data.is_active ?? undefined,
        isHot: data.is_hot ?? undefined,
        notes: data.notes ?? undefined,
        source: data.source ?? undefined,
        website: data.website ?? undefined,
        countryCode: data.country_code ?? undefined,
        createdAt: data.date_created ?? undefined,
        updatedAt: data.date_modified ?? undefined,
        emails:
          data._embedded?.emails ??
          (data.emails && typeof data.emails === 'object'
            ? Object.entries(data.emails)
                .filter(([, value]) => typeof value === 'string')
                .map(([kind, email]) => ({ email, is_primary: kind === 'primary' }))
            : undefined),
        phones: data._embedded?.phones ?? undefined,
        address: data._embedded?.address ?? data.address,
        socialMediaUrls: data.social_media_urls ?? undefined,
        raw: data,
        links: data._links
      },
      message: `Retrieved candidate **${data.first_name ?? ''} ${data.last_name ?? ''}** (ID: ${ctx.input.candidateId}).`
    };
  })
  .build();
