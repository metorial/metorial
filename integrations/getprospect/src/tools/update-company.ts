import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCompany = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Update an existing company record in GetProspect. Provide the company ID and any fields to modify.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      companyId: z.string().describe('ID of the company to update'),
      name: z.string().optional().describe('New company name'),
      url: z.string().optional().describe('New company website URL'),
      industry: z.string().optional().describe('New industry'),
      description: z.string().optional().describe('New description'),
      phone: z.string().optional().describe('New phone number'),
      linkedin: z.string().optional().describe('New LinkedIn page URL'),
      twitter: z.string().optional().describe('New Twitter handle'),
      country: z.string().optional().describe('New country'),
      city: z.string().optional().describe('New city')
    })
  )
  .output(
    z.object({
      companyId: z.string().optional().describe('ID of the updated company'),
      name: z.string().optional().describe('Company name'),
      url: z.string().optional().describe('Company website URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateCompany(ctx.input.companyId, {
      name: ctx.input.name,
      url: ctx.input.url,
      industry: ctx.input.industry,
      description: ctx.input.description,
      phone: ctx.input.phone,
      linkedin: ctx.input.linkedin,
      twitter: ctx.input.twitter,
      country: ctx.input.country,
      city: ctx.input.city
    });

    return {
      output: {
        companyId: result.id ?? result.company_id ?? ctx.input.companyId,
        name: result.name,
        url: result.url
      },
      message: `Updated company **${ctx.input.companyId}**.`
    };
  })
  .build();
