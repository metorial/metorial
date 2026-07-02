import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let supplierSchema = z.object({
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
      pageIndex: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (1-100, default 10)')
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
      pageIndex: ctx.input.pageIndex,
      pageSize: ctx.input.pageSize
    });

    let mapped = suppliers.map((s: any) => ({
      supplierId: s.id,
      companyName: s.companyName,
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
