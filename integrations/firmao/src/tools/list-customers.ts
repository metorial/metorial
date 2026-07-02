import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Search and list customer (counterparty) records from Firmao. Supports filtering by name, NIP number, customer type, email, and other fields using comparison operators. Results are paginated and sortable.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.number().optional().describe('Offset for pagination (default 0)'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      sort: z
        .string()
        .optional()
        .describe('Field name to sort by (e.g., "name", "creationDate")'),
      dir: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      nameContains: z
        .string()
        .optional()
        .describe('Filter customers whose name contains this value'),
      customerType: z
        .string()
        .optional()
        .describe('Filter by customer type (e.g., PARTNER, CLIENT)'),
      nipNumber: z.string().optional().describe('Filter by exact NIP/tax number')
    })
  )
  .output(
    z.object({
      customers: z.array(
        z.object({
          customerId: z.number(),
          name: z.string(),
          label: z.string().optional(),
          customerType: z.string().optional(),
          nipNumber: z.string().optional(),
          emails: z.array(z.string()).optional(),
          phones: z.array(z.string()).optional(),
          website: z.string().optional(),
          description: z.string().optional(),
          officeCity: z.string().optional(),
          officeCountry: z.string().optional(),
          creationDate: z.string().optional(),
          lastModificationDate: z.string().optional()
        })
      ),
      totalSize: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let filters: Record<string, string> = {};
    if (ctx.input.nameContains) filters['name(contains)'] = ctx.input.nameContains;
    if (ctx.input.customerType) filters['customerType(eq)'] = ctx.input.customerType;
    if (ctx.input.nipNumber) filters['nipNumber(eq)'] = ctx.input.nipNumber;

    let result = await client.list('customers', {
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      dir: ctx.input.dir,
      filters
    });

    let customers = result.data.map((c: any) => ({
      customerId: c.id,
      name: c.name,
      label: c.label,
      customerType: c.customerType,
      nipNumber: c.nipNumber,
      emails: c.emails,
      phones: c.phones,
      website: c.website,
      description: c.description,
      officeCity: c.officeAddress?.city,
      officeCountry: c.officeAddress?.country,
      creationDate: c.creationDate,
      lastModificationDate: c.lastModificationDate
    }));

    return {
      output: { customers, totalSize: result.totalSize },
      message: `Found **${customers.length}** customer(s) (total: ${result.totalSize}).`
    };
  })
  .build();
