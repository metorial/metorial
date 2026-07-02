import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  arrayOrUndefined,
  numberOrUndefined,
  objectOrUndefined,
  stringOrUndefined,
  timestampOrUndefined
} from '../lib/output';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve a single company by its Intercom ID. Returns full company details including plan, custom attributes, and user count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      intercomCompanyId: z.string().describe('Intercom company ID')
    })
  )
  .output(
    z.object({
      intercomCompanyId: z.string().describe('Intercom company ID'),
      companyId: z.string().optional().describe('External company ID'),
      name: z.string().optional().describe('Company name'),
      plan: z.string().optional().describe('Plan name'),
      size: z.number().optional().describe('Company size'),
      website: z.string().optional().describe('Website URL'),
      industry: z.string().optional().describe('Industry'),
      monthlySpend: z.number().optional().describe('Monthly spend'),
      userCount: z.number().optional().describe('Number of users'),
      sessionCount: z.number().optional().describe('Number of sessions'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      customAttributes: z.record(z.string(), z.any()).optional().describe('Custom attributes'),
      segments: z.array(z.any()).optional().describe('Associated segments'),
      tags: z.array(z.any()).optional().describe('Associated tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.getCompany(ctx.input.intercomCompanyId);

    return {
      output: {
        intercomCompanyId: String(result.id),
        companyId: stringOrUndefined(result.company_id),
        name: stringOrUndefined(result.name),
        plan: stringOrUndefined(result.plan?.name),
        size: numberOrUndefined(result.size),
        website: stringOrUndefined(result.website),
        industry: stringOrUndefined(result.industry),
        monthlySpend: numberOrUndefined(result.monthly_spend),
        userCount: numberOrUndefined(result.user_count),
        sessionCount: numberOrUndefined(result.session_count),
        createdAt: timestampOrUndefined(result.created_at),
        updatedAt: timestampOrUndefined(result.updated_at),
        customAttributes: objectOrUndefined(result.custom_attributes),
        segments: arrayOrUndefined(result.segments?.data),
        tags: arrayOrUndefined(result.tags?.data)
      },
      message: `Retrieved company **${result.name || result.id}**`
    };
  })
  .build();
