import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLicenseTemplate = SlateTool.create(spec, {
  name: 'Manage License Template',
  key: 'manage_license_template',
  description: `Create, update, or delete a license template. Templates define the types of licenses available for purchase or assignment, including pricing, type, and model-specific parameters.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      licenseTemplateNumber: z
        .string()
        .optional()
        .describe('Template identifier. Required for update/delete. Optional for create.'),
      productModuleNumber: z
        .string()
        .optional()
        .describe('Parent product module number. Required for create.'),
      name: z.string().optional().describe('Template name'),
      active: z.boolean().optional().describe('Whether the template is active'),
      licenseType: z
        .string()
        .optional()
        .describe('License type (e.g., FEATURE, TIMEVOLUME, FLOATING, QUANTITY)'),
      price: z.number().optional().describe('License price'),
      currency: z.string().optional().describe('Currency code (e.g., EUR, USD)'),
      automatic: z
        .boolean()
        .optional()
        .describe('If true, license is automatically created for new licensees'),
      hidden: z.boolean().optional().describe('If true, template is hidden in the shop'),
      hideLicenses: z
        .boolean()
        .optional()
        .describe('If true, licenses from this template are hidden'),
      timeVolume: z
        .number()
        .optional()
        .describe('Time volume value for subscription/time-based models'),
      timeVolumePeriod: z
        .string()
        .optional()
        .describe('Time volume period (DAY, WEEK, MONTH, YEAR)'),
      maxSessions: z.number().optional().describe('Maximum sessions for floating model'),
      quantity: z.number().optional().describe('Quantity for quota-based models'),
      forceCascade: z.boolean().optional().describe('When deleting, force cascade deletion')
    })
  )
  .output(
    z.object({
      licenseTemplateNumber: z.string().describe('Template number'),
      productModuleNumber: z.string().optional().describe('Parent module number'),
      name: z.string().optional().describe('Template name'),
      active: z.boolean().optional().describe('Whether active'),
      licenseType: z.string().optional().describe('License type'),
      price: z.number().optional().describe('Price'),
      currency: z.string().optional().describe('Currency'),
      deleted: z.boolean().optional().describe('True if deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, licenseTemplateNumber, forceCascade, ...params } = ctx.input;

    if (action === 'delete') {
      if (!licenseTemplateNumber)
        throw new Error('licenseTemplateNumber is required for delete');
      await client.deleteLicenseTemplate(licenseTemplateNumber, forceCascade);
      return {
        output: { licenseTemplateNumber, deleted: true },
        message: `License template **${licenseTemplateNumber}** has been deleted.`
      };
    }

    if (action === 'update') {
      if (!licenseTemplateNumber)
        throw new Error('licenseTemplateNumber is required for update');
      let result = await client.updateLicenseTemplate(licenseTemplateNumber, params);
      if (!result) throw new Error('Failed to update license template');
      return {
        output: {
          licenseTemplateNumber: result.number,
          productModuleNumber: result.productModuleNumber,
          name: result.name,
          active: result.active,
          licenseType: result.licenseType,
          price: result.price,
          currency: result.currency
        },
        message: `License template **${result.number}** (${result.name}) has been updated.`
      };
    }

    // create
    let createParams: Record<string, any> = { ...params };
    if (licenseTemplateNumber) createParams.number = licenseTemplateNumber;
    let result = await client.createLicenseTemplate(createParams);
    if (!result) throw new Error('Failed to create license template');
    return {
      output: {
        licenseTemplateNumber: result.number,
        productModuleNumber: result.productModuleNumber,
        name: result.name,
        active: result.active,
        licenseType: result.licenseType,
        price: result.price,
        currency: result.currency
      },
      message: `License template **${result.number}** (${result.name}) has been created.`
    };
  })
  .build();
