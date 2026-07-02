import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBundle = SlateTool.create(spec, {
  name: 'Manage Bundle',
  key: 'manage_bundle',
  description: `Create, update, or delete a license bundle. Bundles group license templates together so that obtaining a bundle creates multiple licenses at once for a licensee.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      bundleNumber: z
        .string()
        .optional()
        .describe('Bundle identifier. Required for update/delete. Optional for create.'),
      name: z.string().optional().describe('Bundle name'),
      active: z.boolean().optional().describe('Whether the bundle is active'),
      description: z.string().optional().describe('Bundle description'),
      price: z.number().optional().describe('Bundle price'),
      currency: z.string().optional().describe('Currency code (e.g., EUR)'),
      licenseTemplatesNumbers: z
        .string()
        .optional()
        .describe('Comma-separated list of license template numbers to include')
    })
  )
  .output(
    z.object({
      bundleNumber: z.string().describe('Bundle number'),
      name: z.string().optional().describe('Bundle name'),
      active: z.boolean().optional().describe('Whether active'),
      description: z.string().optional().describe('Bundle description'),
      price: z.number().optional().describe('Price'),
      currency: z.string().optional().describe('Currency'),
      deleted: z.boolean().optional().describe('True if deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, bundleNumber, ...params } = ctx.input;

    if (action === 'delete') {
      if (!bundleNumber) throw new Error('bundleNumber is required for delete');
      await client.deleteBundle(bundleNumber);
      return {
        output: { bundleNumber, deleted: true },
        message: `Bundle **${bundleNumber}** has been deleted.`
      };
    }

    if (action === 'update') {
      if (!bundleNumber) throw new Error('bundleNumber is required for update');
      let result = await client.updateBundle(bundleNumber, params);
      if (!result) throw new Error('Failed to update bundle');
      return {
        output: {
          bundleNumber: result.number,
          name: result.name,
          active: result.active,
          description: result.description,
          price: result.price,
          currency: result.currency
        },
        message: `Bundle **${result.number}** (${result.name}) has been updated.`
      };
    }

    // create
    let createParams: Record<string, any> = { ...params };
    if (bundleNumber) createParams.number = bundleNumber;
    let result = await client.createBundle(createParams);
    if (!result) throw new Error('Failed to create bundle');
    return {
      output: {
        bundleNumber: result.number,
        name: result.name,
        active: result.active,
        description: result.description,
        price: result.price,
        currency: result.currency
      },
      message: `Bundle **${result.number}** (${result.name}) has been created.`
    };
  })
  .build();
