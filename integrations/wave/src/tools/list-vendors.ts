import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaveClient } from '../lib/client';
import { spec } from '../spec';

let vendorOutputSchema = z.object({
  vendorId: z.string().describe('Unique identifier of the vendor'),
  name: z.string().describe('Vendor name'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  displayId: z.string().optional().describe('Display identifier'),
  email: z.string().optional().describe('Email address'),
  mobile: z.string().optional().describe('Mobile number'),
  phone: z.string().optional().describe('Phone number'),
  fax: z.string().optional().describe('Fax number'),
  tollFree: z.string().optional().describe('Toll-free number'),
  website: z.string().optional().describe('Website URL'),
  internalNotes: z.string().optional().describe('Internal notes'),
  currency: z
    .object({
      code: z.string().optional(),
      symbol: z.string().optional(),
      name: z.string().optional()
    })
    .optional()
    .describe('Currency preference'),
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
    .describe('Vendor address'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modification timestamp')
});

export let listVendors = SlateTool.create(spec, {
  name: 'List Vendors',
  key: 'list_vendors',
  description: `List vendors for a Wave business. Returns vendor contact details, address, and currency information. Vendors are suppliers or service providers associated with the business.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      businessId: z.string().describe('ID of the business to list vendors for'),
      page: z.number().optional().describe('Page number (starts at 1, default: 1)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 20)')
    })
  )
  .output(
    z.object({
      vendors: z.array(vendorOutputSchema).describe('List of vendors'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      totalCount: z.number().describe('Total number of vendors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.listVendors(
      ctx.input.businessId,
      ctx.input.page || 1,
      ctx.input.pageSize || 20
    );

    let vendors = result.items.map((v: any) => ({
      vendorId: v.id,
      name: v.name,
      firstName: v.firstName,
      lastName: v.lastName,
      displayId: v.displayId,
      email: v.email,
      mobile: v.mobile,
      phone: v.phone,
      fax: v.fax,
      tollFree: v.tollFree,
      website: v.website,
      internalNotes: v.internalNotes,
      currency: v.currency,
      address: v.address,
      createdAt: v.createdAt,
      modifiedAt: v.modifiedAt
    }));

    return {
      output: {
        vendors,
        currentPage: result.pageInfo.currentPage,
        totalPages: result.pageInfo.totalPages,
        totalCount: result.pageInfo.totalCount
      },
      message: `Found **${result.pageInfo.totalCount}** vendors (page ${result.pageInfo.currentPage} of ${result.pageInfo.totalPages}).`
    };
  })
  .build();
