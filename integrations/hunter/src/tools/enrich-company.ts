import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enrichCompany = SlateTool.create(spec, {
  name: 'Enrich Company',
  key: 'enrich_company',
  description: `Retrieve detailed company profile information by domain name. Returns industry classification, location, description, employee count, founding year, technologies used, funding details, social profiles, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name of the company (e.g., "stripe.com")')
    })
  )
  .output(
    z.object({
      domain: z.string().nullable().describe('Company domain'),
      name: z.string().nullable().describe('Company name'),
      description: z.string().nullable().describe('Company description'),
      industry: z.string().nullable().describe('Industry classification'),
      headcount: z.string().nullable().describe('Employee count range'),
      foundedYear: z.number().nullable().describe('Year the company was founded'),
      country: z.string().nullable().describe('Headquarters country'),
      city: z.string().nullable().describe('Headquarters city'),
      state: z.string().nullable().describe('Headquarters state'),
      linkedinUrl: z.string().nullable().describe('LinkedIn company page URL'),
      twitterHandle: z.string().nullable().describe('Twitter handle'),
      facebookHandle: z.string().nullable().describe('Facebook page URL'),
      phone: z.string().nullable().describe('Phone number'),
      technologies: z
        .array(z.string())
        .optional()
        .describe('Technologies used by the company'),
      tags: z.array(z.string()).optional().describe('Category tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.enrichCompany(ctx.input.domain);
    let data = result.data;

    return {
      output: {
        domain: data.domain ?? ctx.input.domain,
        name: data.name ?? null,
        description: data.description ?? null,
        industry: data.industry ?? null,
        headcount: data.headcount ?? null,
        foundedYear: data.founded_year ?? null,
        country: data.country ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        linkedinUrl: data.linkedin_url ?? null,
        twitterHandle: data.twitter_handle ?? null,
        facebookHandle: data.facebook_handle ?? null,
        phone: data.phone ?? null,
        technologies: data.technologies ?? [],
        tags: data.tags ?? []
      },
      message: data.name
        ? `Found company **${data.name}** (${data.industry ?? 'unknown industry'}, ${data.headcount ?? 'unknown size'} employees).`
        : `No company data found for **${ctx.input.domain}**.`
    };
  })
  .build();
