import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCompany = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description: `Create a new company record in GetProspect. Companies can be associated with leads for organization and outreach.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Company name'),
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
  .output(
    z.object({
      companyId: z.string().optional().describe('ID of the newly created company'),
      name: z.string().optional().describe('Company name'),
      url: z.string().optional().describe('Company website URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createCompany({
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
        companyId: result.id ?? result.company_id,
        name: result.name ?? ctx.input.name,
        url: result.url ?? ctx.input.url
      },
      message: `Created company **${ctx.input.name}**.`
    };
  })
  .build();
