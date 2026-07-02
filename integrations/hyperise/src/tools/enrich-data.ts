import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enrichData = SlateTool.create(spec, {
  name: 'Enrich Contact Data',
  key: 'enrich_data',
  description: `Enrich a contact's data from an email address. Returns person details (name, profile image, job title) and company details (business name, logo, website, address) sourced from 200+ public and private data sources. Optionally provide an image template hash for fallback data.`,
  instructions: [
    'Provide just the email address to get enriched person and company data.',
    'The optional imageTemplateHash provides fallback data if enrichment fails.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to enrich data for'),
      imageTemplateHash: z
        .string()
        .optional()
        .describe('Image template hash for fallback data resolution')
    })
  )
  .output(
    z
      .object({
        enrichmentId: z.string().optional().describe('Unique ID of the enrichment record'),
        firstName: z.string().optional().describe('Enriched first name'),
        lastName: z.string().optional().describe('Enriched last name'),
        email: z.string().optional().describe('Input email address'),
        jobTitle: z.string().optional().describe('Enriched job title'),
        gender: z.string().optional().describe('Enriched gender'),
        businessName: z.string().optional().describe('Enriched business name'),
        businessAddress: z.string().optional().describe('Enriched business address'),
        website: z.string().optional().describe('Enriched company website'),
        logoUrl: z.string().optional().describe('Company logo image URL'),
        profileImageUrl: z.string().optional().describe('Person profile image URL')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.enrichData(ctx.input.email, ctx.input.imageTemplateHash);

    let data = result?.data ?? result;

    let logoUrl = typeof data.logo === 'object' ? data.logo?.url : data.logo;
    let profileImageUrl =
      typeof data.profile_image === 'object' ? data.profile_image?.url : data.profile_image;

    return {
      output: {
        enrichmentId: data.id?.toString(),
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        jobTitle: data.job_title,
        gender: data.gender,
        businessName: data.business_name,
        businessAddress: data.business_address,
        website: data.website,
        logoUrl,
        profileImageUrl,
        ...data
      },
      message:
        `Enriched data for **${ctx.input.email}**: ${data.first_name || ''} ${data.last_name || ''} ${data.business_name ? `at ${data.business_name}` : ''}`.trim()
    };
  })
  .build();
