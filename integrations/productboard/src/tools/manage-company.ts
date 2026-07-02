import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCompaniesTool = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `List companies that provide feedback. Companies can be associated with users and notes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageCursor: z.string().optional().describe('Cursor for pagination'),
      pageLimit: z.number().optional().describe('Maximum number of companies per page')
    })
  )
  .output(
    z.object({
      companies: z.array(z.record(z.string(), z.any())).describe('List of companies'),
      pageCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCompanies({
      pageCursor: ctx.input.pageCursor,
      pageLimit: ctx.input.pageLimit
    });

    return {
      output: {
        companies: result.data,
        pageCursor: result.pageCursor
      },
      message: `Retrieved ${result.data.length} company(ies).`
    };
  })
  .build();

export let createCompanyTool = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description: `Create a new company. Companies can be associated with feedback users and notes.`
})
  .input(
    z.object({
      name: z.string().describe('Name of the company'),
      domain: z.string().optional().describe('Domain of the company (e.g. "acme.com")')
    })
  )
  .output(
    z.object({
      company: z.record(z.string(), z.any()).describe('The created company')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let company = await client.createCompany({
      name: ctx.input.name,
      domain: ctx.input.domain
    });

    return {
      output: { company },
      message: `Created company **${ctx.input.name}**.`
    };
  })
  .build();

export let updateCompanyTool = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Update an existing company's name or domain.`
})
  .input(
    z.object({
      companyId: z.string().describe('The ID of the company to update'),
      name: z.string().optional().describe('New name for the company'),
      domain: z.string().optional().describe('New domain for the company')
    })
  )
  .output(
    z.object({
      company: z.record(z.string(), z.any()).describe('The updated company')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let company = await client.updateCompany(ctx.input.companyId, {
      name: ctx.input.name,
      domain: ctx.input.domain
    });

    return {
      output: { company },
      message: `Updated company **${ctx.input.companyId}**.`
    };
  })
  .build();
