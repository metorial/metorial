import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCompany = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description: `Creates a new customer company in Rocketlane. Companies represent the customer organizations associated with onboarding projects.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companyName: z.string().describe('Name of the company'),
      companyUrl: z.string().optional().describe('Company website URL'),
      fields: z
        .array(
          z.object({
            fieldId: z.number().describe('Custom field ID'),
            fieldValue: z.any().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom field values')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('Unique ID of the created company'),
      companyName: z.string().describe('Company name'),
      companyUrl: z.string().nullable().optional().describe('Company URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createCompany({
      companyName: ctx.input.companyName,
      companyUrl: ctx.input.companyUrl,
      fields: ctx.input.fields
    });

    return {
      output: result,
      message: `Company **${result.companyName}** created successfully (ID: ${result.companyId}).`
    };
  })
  .build();

export let updateCompany = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Updates an existing customer company in Rocketlane. Supports changing the name, URL, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.number().describe('ID of the company to update'),
      companyName: z.string().optional().describe('New company name'),
      companyUrl: z.string().optional().describe('New company URL'),
      fields: z
        .array(
          z.object({
            fieldId: z.number().describe('Custom field ID'),
            fieldValue: z.any().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom field values to update')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('ID of the updated company'),
      companyName: z.string().optional().describe('Updated company name'),
      companyUrl: z.string().nullable().optional().describe('Updated company URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateCompany(ctx.input.companyId, {
      companyName: ctx.input.companyName,
      companyUrl: ctx.input.companyUrl,
      fields: ctx.input.fields
    });

    return {
      output: result,
      message: `Company **${result.companyName || ctx.input.companyId}** updated successfully.`
    };
  })
  .build();

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `Lists customer companies in Rocketlane with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of companies to return')
    })
  )
  .output(
    z.object({
      companies: z
        .array(
          z.object({
            companyId: z.number().describe('Company ID'),
            companyName: z.string().describe('Company name'),
            companyUrl: z.string().nullable().optional().describe('Company URL')
          })
        )
        .describe('List of companies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCompanies({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let companies = Array.isArray(result) ? result : (result.companies ?? result.data ?? []);

    return {
      output: { companies },
      message: `Found **${companies.length}** company(ies).`
    };
  })
  .build();
