import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve a single company record by its ID. Returns the full company details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.string().describe('ID of the company to retrieve')
    })
  )
  .output(
    z.object({
      companyId: z.string().optional().describe('Unique identifier for the company'),
      name: z.string().optional().describe('Company name'),
      url: z.string().optional().describe('Company website URL'),
      industry: z.string().optional().describe('Industry'),
      description: z.string().optional().describe('Company description'),
      phone: z.string().optional().describe('Phone number'),
      linkedin: z.string().optional().describe('LinkedIn page URL'),
      twitter: z.string().optional().describe('Twitter handle'),
      country: z.string().optional().describe('Country'),
      city: z.string().optional().describe('City')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCompany(ctx.input.companyId);

    return {
      output: {
        companyId: result.id ?? result.company_id,
        name: result.name,
        url: result.url,
        industry: result.industry,
        description: result.description,
        phone: result.phone,
        linkedin: result.linkedin,
        twitter: result.twitter,
        country: result.country,
        city: result.city
      },
      message: `Retrieved company **${result.name ?? ctx.input.companyId}**.`
    };
  })
  .build();
