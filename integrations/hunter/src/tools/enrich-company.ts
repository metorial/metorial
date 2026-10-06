import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  Client,
  optionalNumber,
  optionalRow,
  optionalStrings,
  optionalText,
  row
} from '../lib/client';
import { spec } from '../spec';

export let enrichCompany = SlateTool.create(spec, {
  name: 'Enrich Company',
  key: 'enrich_company',
  description: `Retrieve detailed company profile information by domain name. Returns industry classification, location, description, employee count, founding year, technologies used and social profiles.`,
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
    const result = await new Client({ token: ctx.auth.token }).enrichCompany(ctx.input.domain);
    const data = row(result.data),
      geo = optionalRow(data.geo),
      category = optionalRow(data.category),
      metrics = optionalRow(data.metrics);
    const linkedin = optionalText(optionalRow(data.linkedin).handle);
    return {
      output: {
        domain: optionalText(data.domain) ?? null,
        name: optionalText(data.name) ?? null,
        description: optionalText(data.description) ?? null,
        industry: optionalText(category.industry) ?? null,
        headcount: optionalText(metrics.employees) ?? null,
        foundedYear: optionalNumber(data.foundedYear) ?? null,
        country: optionalText(geo.country) ?? null,
        city: optionalText(geo.city) ?? null,
        state: optionalText(geo.state) ?? null,
        linkedinUrl: linkedin
          ? `https://www.linkedin.com/${linkedin.split('/').map(encodeURIComponent).join('/')}`
          : null,
        twitterHandle: optionalText(optionalRow(data.twitter).handle) ?? null,
        facebookHandle: optionalText(optionalRow(data.facebook).handle) ?? null,
        phone: optionalText(data.phone) ?? null,
        technologies: optionalStrings(data.tech),
        tags: optionalStrings(data.tags)
      },
      message: 'Retrieved the company enrichment profile.'
    };
  })
  .build();
