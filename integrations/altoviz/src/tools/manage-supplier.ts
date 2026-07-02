import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSupplier = SlateTool.create(spec, {
  name: 'Manage Supplier',
  key: 'manage_supplier',
  description: `Create, update, or delete a supplier in Altoviz. Set **action** to "create", "update", or "delete".`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      supplierId: z
        .number()
        .optional()
        .describe('Altoviz supplier ID (required for update and delete)'),
      companyName: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      number: z.string().optional().describe('Supplier number')
    })
  )
  .output(
    z.object({
      supplierId: z.number().optional().describe('Altoviz supplier ID'),
      deleted: z.boolean().optional(),
      companyName: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, supplierId, ...data } = ctx.input;

    if (action === 'create') {
      let result = await client.createSupplier(data);
      return {
        output: { supplierId: result.id, companyName: result.companyName },
        message: `Created supplier **${result.companyName || result.id}**.`
      };
    } else if (action === 'update') {
      if (!supplierId) throw new Error('supplierId is required for update');
      let result = await client.updateSupplier(supplierId, data);
      return {
        output: { supplierId: result.id, companyName: result.companyName },
        message: `Updated supplier **${result.companyName || result.id}**.`
      };
    } else {
      if (!supplierId) throw new Error('supplierId is required for delete');
      await client.deleteSupplier(supplierId);
      return {
        output: { supplierId, deleted: true },
        message: `Deleted supplier with ID **${supplierId}**.`
      };
    }
  })
  .build();
