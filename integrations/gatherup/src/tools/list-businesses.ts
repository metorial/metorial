import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listBusinesses = SlateTool.create(spec, {
  name: 'List Businesses',
  key: 'list_businesses',
  description: `Retrieve a paginated list of business locations managed in GatherUp.
Returns business names, addresses, types, and metadata. Supports filtering deleted businesses and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (defaults to 1)'),
      limit: z.number().optional().describe('Number of businesses per page (defaults to 100)'),
      includeDeleted: z
        .boolean()
        .optional()
        .describe('Whether to include deleted businesses (defaults to true)')
    })
  )
  .output(
    z.object({
      businesses: z
        .array(
          z.object({
            businessId: z.number().describe('Unique business identifier'),
            businessName: z.string().optional().describe('Name of the business'),
            businessPhone: z.string().optional().describe('Business phone number'),
            businessCity: z.string().optional().describe('City'),
            businessState: z.string().optional().describe('State'),
            businessZip: z.string().optional().describe('Postal code'),
            businessCountry: z.string().optional().describe('Country'),
            businessStreetAddress: z.string().optional().describe('Street address'),
            businessType: z.string().optional().describe('Google business type'),
            businessOrganisationType: z.string().optional().describe('Organisation type'),
            businessPackage: z.string().optional().describe('Subscription package'),
            businessWebsiteURL: z.string().optional().describe('Business website URL'),
            customField: z.string().optional().describe('Custom field value')
          })
        )
        .describe('List of businesses'),
      page: z.number().describe('Current page number'),
      pages: z.number().describe('Total number of pages'),
      totalCount: z.number().describe('Total number of businesses')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.listBusinesses({
      page: ctx.input.page,
      limit: ctx.input.limit,
      includeDeletedBusinesses: ctx.input.includeDeleted === false ? 0 : 1
    });

    let count =
      typeof data.count === 'number' ? data.count : Number.parseInt(data.count || '0', 10);
    let businesses: Record<string, unknown>[] = [];

    for (let i = 1; i <= count; i++) {
      businesses.push({
        businessId: data[`businessId${i}`],
        businessName: data[`businessName${i}`],
        businessPhone: data[`businessPhone${i}`],
        businessCity: data[`businessCity${i}`],
        businessState: data[`businessState${i}`],
        businessZip: data[`businessZip${i}`],
        businessCountry: data[`businessCountry${i}`],
        businessStreetAddress: data[`businessStreetAddress${i}`],
        businessType: data[`businessType${i}`],
        businessOrganisationType: data[`businessOrganisationType${i}`],
        businessPackage: data[`businessPackage${i}`],
        businessWebsiteURL: data[`businessWebsiteURL${i}`],
        customField: data[`customField${i}`]
      });
    }

    return {
      output: {
        businesses,
        page: data.page ?? 1,
        pages: data.pages ?? 1,
        totalCount: count
      } as any,
      message: `Found **${count}** business(es) (page ${data.page ?? 1} of ${data.pages ?? 1}).`
    };
  })
  .build();
