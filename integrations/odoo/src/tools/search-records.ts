import { SlateTool } from 'slates';
import { z } from 'zod';
import type { OdooDomainFilter } from '../lib/client';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let domainFilterSchema = z
  .array(
    z.union([
      z.string().describe('Logical operator: "&", "|", or "!"'),
      z.tuple([
        z.string().describe('Field name'),
        z
          .string()
          .describe('Operator (=, !=, >, <, >=, <=, like, ilike, in, not in, child_of, etc.)'),
        z.unknown().describe('Value to compare against')
      ])
    ])
  )
  .describe(
    'Odoo domain filter: array of condition tuples [field, operator, value] and optional logical operators ("&", "|", "!")'
  );

let normalizeDomainFilter = (
  domain: Array<string | [string?, string?, unknown?, ...unknown[]]>
): OdooDomainFilter => {
  return domain
    .map(item => {
      if (typeof item === 'string') return item;
      let [field, operator, value] = item;
      if (typeof field !== 'string' || typeof operator !== 'string') return null;
      return [field, operator, value] as [string, string, unknown];
    })
    .filter((item): item is string | [string, string, unknown] => item !== null);
};

export let searchRecords = SlateTool.create(spec, {
  name: 'Search Records',
  key: 'search_records',
  description: `Search and retrieve records from any Odoo model using domain filters. Supports pagination, field selection, and sorting. Use this to find contacts, leads, orders, invoices, products, or any other record type.

Common models: **res.partner** (contacts), **crm.lead** (leads/opportunities), **sale.order** (sales orders), **account.move** (invoices/bills), **product.product** (products), **stock.picking** (transfers), **project.task** (tasks), **hr.employee** (employees).`,
  instructions: [
    'Domain filters use Polish notation: ["&", ["field", "=", value], ["field2", ">", value2]] for AND, ["|", ...] for OR.',
    'Pass an empty domain [] to retrieve all records (subject to limit).',
    'Use "ilike" operator for case-insensitive partial matching.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe('The Odoo model to search (e.g., "res.partner", "sale.order", "crm.lead")'),
      domain: domainFilterSchema
        .default([])
        .describe('Domain filter conditions. Empty array [] returns all records.'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Specific field names to return. Omit to return all fields.'),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe('Maximum number of records to return (default: 50)'),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe('Number of records to skip for pagination (default: 0)'),
      order: z
        .string()
        .optional()
        .describe('Sort order (e.g., "name asc", "create_date desc")')
    })
  )
  .output(
    z.object({
      records: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of matching records'),
      count: z
        .number()
        .describe('Total count of records matching the domain (ignoring limit/offset)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let domain = normalizeDomainFilter(ctx.input.domain);

    let [records, count] = await Promise.all([
      client.searchRead(ctx.input.model, domain, {
        fields: ctx.input.fields,
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        order: ctx.input.order
      }),
      client.searchCount(ctx.input.model, domain)
    ]);

    return {
      output: { records, count },
      message: `Found **${count}** record(s) in \`${ctx.input.model}\`. Returned ${records.length} record(s) (offset: ${ctx.input.offset ?? 0}).`
    };
  })
  .build();
