import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve a company's full profile from CentralStationCRM by its ID. Use **includes** to fetch related people, tags, and other nested data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.number().describe('ID of the company to retrieve'),
      includes: z
        .string()
        .optional()
        .describe('Comma-separated list of related data to include (e.g., "people,tags")')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('ID of the company'),
      companyName: z.string().optional().describe('Name of the company'),
      background: z.string().optional().describe('Background information'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      rawData: z
        .any()
        .optional()
        .describe('Complete raw company data from API including any requested includes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let result = await client.getCompany(ctx.input.companyId, {
      includes: ctx.input.includes
    });

    let company = result?.company ?? result;

    return {
      output: {
        companyId: company.id,
        companyName: company.name,
        background: company.background,
        createdAt: company.created_at,
        updatedAt: company.updated_at,
        rawData: result
      },
      message: `Retrieved company **${company.name}** (ID: ${company.id}).`
    };
  })
  .build();
