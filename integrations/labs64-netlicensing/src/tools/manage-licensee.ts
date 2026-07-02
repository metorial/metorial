import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLicensee = SlateTool.create(spec, {
  name: 'Manage Licensee',
  key: 'manage_licensee',
  description: `Create, update, or delete a licensee (customer). Licensees represent end customers or product instances that consume licenses. Each licensee is associated with a product.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      licenseeNumber: z
        .string()
        .optional()
        .describe('Licensee identifier. Required for update/delete. Optional for create.'),
      productNumber: z.string().optional().describe('Product number. Required for create.'),
      name: z.string().optional().describe('Licensee name'),
      active: z.boolean().optional().describe('Whether the licensee is active'),
      licenseeSecret: z.string().optional().describe('Secret for licensee validation'),
      markedForTransfer: z
        .boolean()
        .optional()
        .describe('Mark this licensee as a source for license transfer'),
      forceCascade: z
        .boolean()
        .optional()
        .describe('When deleting, force cascade deletion of licenses')
    })
  )
  .output(
    z.object({
      licenseeNumber: z.string().describe('Licensee number'),
      productNumber: z.string().optional().describe('Associated product number'),
      name: z.string().optional().describe('Licensee name'),
      active: z.boolean().optional().describe('Whether active'),
      markedForTransfer: z.boolean().optional().describe('Whether marked for transfer'),
      deleted: z.boolean().optional().describe('True if deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, licenseeNumber, forceCascade, ...params } = ctx.input;

    if (action === 'delete') {
      if (!licenseeNumber) throw new Error('licenseeNumber is required for delete');
      await client.deleteLicensee(licenseeNumber, forceCascade);
      return {
        output: { licenseeNumber, deleted: true },
        message: `Licensee **${licenseeNumber}** has been deleted.`
      };
    }

    if (action === 'update') {
      if (!licenseeNumber) throw new Error('licenseeNumber is required for update');
      let result = await client.updateLicensee(licenseeNumber, params);
      if (!result) throw new Error('Failed to update licensee');
      return {
        output: {
          licenseeNumber: result.number,
          productNumber: result.productNumber,
          name: result.name,
          active: result.active,
          markedForTransfer: result.markedForTransfer
        },
        message: `Licensee **${result.number}** (${result.name || 'unnamed'}) has been updated.`
      };
    }

    // create
    let createParams: Record<string, any> = { ...params };
    if (licenseeNumber) createParams.number = licenseeNumber;
    let result = await client.createLicensee(createParams);
    if (!result) throw new Error('Failed to create licensee');
    return {
      output: {
        licenseeNumber: result.number,
        productNumber: result.productNumber,
        name: result.name,
        active: result.active,
        markedForTransfer: result.markedForTransfer
      },
      message: `Licensee **${result.number}** (${result.name || 'unnamed'}) has been created.`
    };
  })
  .build();
