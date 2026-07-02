import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve a single company record by ID with full details.`,
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
      companyId: z.string().describe('Company ID'),
      name: z.string().optional().describe('Company name'),
      website: z.string().optional().describe('Website'),
      notes: z.string().optional().describe('Notes'),
      isHot: z.boolean().optional().describe('Whether hot'),
      keyTechnologies: z.string().optional().describe('Key technologies'),
      countryCode: z.string().optional().describe('Country code'),
      createdAt: z.string().optional().describe('Created date'),
      updatedAt: z.string().optional().describe('Updated date'),
      address: z.any().optional().describe('Address'),
      phones: z.array(z.any()).optional().describe('Phone numbers'),
      links: z.any().optional().describe('HAL links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getCompany(ctx.input.companyId);

    return {
      output: {
        companyId: (data.id ?? ctx.input.companyId).toString(),
        name: data.name,
        website: data.website,
        notes: data.notes,
        isHot: data.is_hot,
        keyTechnologies: data.key_technologies,
        countryCode: data.country_code,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        address: data._embedded?.address ?? data.address,
        phones: data._embedded?.phones,
        links: data._links
      },
      message: `Retrieved company **${data.name ?? ctx.input.companyId}** (ID: ${ctx.input.companyId}).`
    };
  })
  .build();
