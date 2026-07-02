import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaveClient } from '../lib/client';
import { spec } from '../spec';

let businessSchema = z.object({
  businessId: z.string().describe('Unique identifier of the business'),
  name: z.string().describe('Name of the business'),
  isPersonal: z.boolean().optional().describe('Whether this is a personal business'),
  organizationType: z.string().optional().describe('Organization type'),
  type: z
    .object({
      name: z.string().optional(),
      value: z.string().optional()
    })
    .optional()
    .describe('Business type'),
  subtype: z
    .object({
      name: z.string().optional(),
      value: z.string().optional()
    })
    .optional()
    .describe('Business subtype'),
  currency: z
    .object({
      code: z.string().optional(),
      symbol: z.string().optional(),
      name: z.string().optional()
    })
    .optional()
    .describe('Default currency'),
  address: z
    .object({
      addressLine1: z.string().optional(),
      addressLine2: z.string().optional(),
      city: z.string().optional(),
      postalCode: z.string().optional(),
      province: z
        .object({ code: z.string().optional(), name: z.string().optional() })
        .optional(),
      country: z
        .object({ code: z.string().optional(), name: z.string().optional() })
        .optional()
    })
    .optional()
    .describe('Business address'),
  phone: z.string().optional().describe('Phone number'),
  website: z.string().optional().describe('Website URL'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modification timestamp')
});

export let listBusinesses = SlateTool.create(spec, {
  name: 'List Businesses',
  key: 'list_businesses',
  description: `Retrieve businesses associated with the authenticated Wave account. Each business is a separate entity with its own chart of accounts, customers, and financial data. Use this to discover available businesses before performing business-scoped operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (starts at 1, default: 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (default: 20, max: 100)')
    })
  )
  .output(
    z.object({
      businesses: z.array(businessSchema).describe('List of businesses'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      totalCount: z.number().describe('Total number of businesses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.listBusinesses(ctx.input.page || 1, ctx.input.pageSize || 20);

    let businesses = result.items.map((b: any) => ({
      businessId: b.id,
      name: b.name,
      isPersonal: b.isPersonal,
      organizationType: b.organizationType,
      type: b.type,
      subtype: b.subtype,
      currency: b.currency,
      address: b.address,
      phone: b.phone,
      website: b.website,
      createdAt: b.createdAt,
      modifiedAt: b.modifiedAt
    }));

    return {
      output: {
        businesses,
        currentPage: result.pageInfo.currentPage,
        totalPages: result.pageInfo.totalPages,
        totalCount: result.pageInfo.totalCount
      },
      message: `Found **${result.pageInfo.totalCount}** businesses (page ${result.pageInfo.currentPage} of ${result.pageInfo.totalPages}).`
    };
  })
  .build();
