import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `List and search Chameleon companies (accounts). Supports filtering with segmentation filter expressions.
Can also retrieve a specific company by Chameleon ID or external UID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z
        .string()
        .optional()
        .describe('Chameleon company ID to retrieve a specific company'),
      uid: z
        .string()
        .optional()
        .describe('External company identifier to retrieve a specific company'),
      filters: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of segmentation filter expressions for searching'),
      expandCompany: z
        .enum(['all', 'min'])
        .optional()
        .describe('Level of company detail. "all" returns all properties'),
      limit: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe('Number of companies to return (1-500, default 50)'),
      before: z.string().optional().describe('Pagination cursor for older items'),
      after: z.string().optional().describe('Pagination cursor for newer items')
    })
  )
  .output(
    z.object({
      company: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Single company object (when fetching by ID/UID)'),
      companies: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of company objects'),
      cursor: z
        .object({
          limit: z.number().optional(),
          before: z.string().optional()
        })
        .optional()
        .describe('Pagination cursor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);

    if (ctx.input.companyId || ctx.input.uid) {
      let result = await client.getCompany({
        companyId: ctx.input.companyId,
        uid: ctx.input.uid
      });
      return {
        output: { company: result },
        message: `Retrieved company **${result.uid || result.id}**.`
      };
    }

    let expand = ctx.input.expandCompany ? { company: ctx.input.expandCompany } : undefined;
    let result = await client.listCompanies({
      filters: ctx.input.filters,
      expand,
      limit: ctx.input.limit,
      before: ctx.input.before,
      after: ctx.input.after
    });

    let companies = result.companies || [];
    return {
      output: {
        companies,
        cursor: result.cursor
      },
      message: `Returned **${companies.length}** companies.`
    };
  })
  .build();
