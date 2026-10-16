import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let supplierSchema = z.object({
  raw: z.record(z.string(), z.unknown()).optional(),
  supplierId: z.number().describe('Altoviz supplier ID'),
  companyName: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  number: z.string().nullable().optional()
});

export let listSuppliers = SlateTool.create(spec, {
  name: 'List Suppliers',
  key: 'list_suppliers',
  description: `List suppliers from your Altoviz account with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Full-text search query'),
      orderBy: z
        .string()
        .optional()
        .describe('Provider ordering expression, for example name desc'),
      pageIndex: z.number().optional().describe('Page index (starts at 1)'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      suppliers: z.array(supplierSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let suppliers = await client.listSuppliers({
      query: ctx.input.query,
      orderBy: ctx.input.orderBy,
      pageIndex: ctx.input.pageIndex,
      pageSize: ctx.input.pageSize
    });

    let mapped = suppliers.map((s: any) => ({
      raw: s,
      supplierId: s.id,
      companyName: s.name ?? s.companyName,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      phone: s.phone,
      number: s.number
    }));

    return {
      output: { suppliers: mapped },
      message: `Found **${mapped.length}** supplier(s).`
    };
  })
  .build();
