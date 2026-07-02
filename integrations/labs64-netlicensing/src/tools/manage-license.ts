import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLicense = SlateTool.create(spec, {
  name: 'Manage License',
  key: 'manage_license',
  description: `Create, update, or delete a license for a licensee. Licenses are created from license templates and processed by licensing models during validation.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      licenseNumber: z
        .string()
        .optional()
        .describe('License identifier. Required for update/delete. Optional for create.'),
      licenseeNumber: z.string().optional().describe('Licensee number. Required for create.'),
      licenseTemplateNumber: z
        .string()
        .optional()
        .describe('License template number. Required for create.'),
      name: z.string().optional().describe('License name'),
      active: z.boolean().optional().describe('Whether the license is active'),
      price: z.number().optional().describe('License price'),
      currency: z.string().optional().describe('Currency code (e.g., EUR, USD)'),
      hidden: z.boolean().optional().describe('Whether the license is hidden'),
      startDate: z.string().optional().describe('License start date (ISO 8601)'),
      timeVolume: z.number().optional().describe('Time volume for subscription models'),
      timeVolumePeriod: z
        .string()
        .optional()
        .describe('Time volume period (DAY, WEEK, MONTH, YEAR)'),
      parentfeature: z.string().optional().describe('Parent feature for multi-feature models')
    })
  )
  .output(
    z.object({
      licenseNumber: z.string().describe('License number'),
      licenseeNumber: z.string().optional().describe('Associated licensee number'),
      licenseTemplateNumber: z.string().optional().describe('Template number'),
      productModuleNumber: z.string().optional().describe('Module number'),
      name: z.string().optional().describe('License name'),
      active: z.boolean().optional().describe('Whether active'),
      price: z.number().optional().describe('Price'),
      currency: z.string().optional().describe('Currency'),
      deleted: z.boolean().optional().describe('True if deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, licenseNumber, ...params } = ctx.input;

    if (action === 'delete') {
      if (!licenseNumber) throw new Error('licenseNumber is required for delete');
      await client.deleteLicense(licenseNumber);
      return {
        output: { licenseNumber, deleted: true },
        message: `License **${licenseNumber}** has been deleted.`
      };
    }

    if (action === 'update') {
      if (!licenseNumber) throw new Error('licenseNumber is required for update');
      let result = await client.updateLicense(licenseNumber, params);
      if (!result) throw new Error('Failed to update license');
      return {
        output: {
          licenseNumber: result.number,
          licenseeNumber: result.licenseeNumber,
          licenseTemplateNumber: result.licenseTemplateNumber,
          productModuleNumber: result.productModuleNumber,
          name: result.name,
          active: result.active,
          price: result.price,
          currency: result.currency
        },
        message: `License **${result.number}** has been updated.`
      };
    }

    // create
    let createParams: Record<string, any> = { ...params };
    if (licenseNumber) createParams.number = licenseNumber;
    let result = await client.createLicense(createParams);
    if (!result) throw new Error('Failed to create license');
    return {
      output: {
        licenseNumber: result.number,
        licenseeNumber: result.licenseeNumber,
        licenseTemplateNumber: result.licenseTemplateNumber,
        productModuleNumber: result.productModuleNumber,
        name: result.name,
        active: result.active,
        price: result.price,
        currency: result.currency
      },
      message: `License **${result.number}** has been created for licensee **${result.licenseeNumber}**.`
    };
  })
  .build();
