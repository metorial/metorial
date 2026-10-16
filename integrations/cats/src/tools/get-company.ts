import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requiredId } from '../lib/response';
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
      raw: z.any().optional().describe('Complete provider response, retaining null values'),
      links: z.any().optional().describe('HAL links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getCompany(ctx.input.companyId);

    return {
      output: {
        companyId: requiredId(data?.id, 'record'),
        name: data.name ?? undefined,
        website: data.website ?? undefined,
        notes: data.notes ?? undefined,
        isHot: data.is_hot ?? undefined,
        keyTechnologies: data.key_technologies ?? undefined,
        countryCode: data.country_code ?? undefined,
        createdAt: data.date_created ?? undefined,
        updatedAt: data.date_modified ?? undefined,
        address: data._embedded?.address ?? data.address,
        phones: data._embedded?.phones ?? undefined,
        raw: data,
        links: data._links
      },
      message: `Retrieved company **${data.name ?? ctx.input.companyId}** (ID: ${ctx.input.companyId}).`
    };
  })
  .build();
