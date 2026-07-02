import { SlateTool } from 'slates';
import { z } from 'zod';
import { LicenseClient } from '../lib/client';
import { spec } from '../spec';

export let updateLicenseUsage = SlateTool.create(spec, {
  name: 'Update License Usage',
  key: 'update_license_usage',
  description: `Increments or decrements the usage counter of a license key. Useful for enforcing per-seat or limited-use licensing models.
Requires the **product secret key** to be configured in the authentication settings.`,
  instructions: [
    'Use "increase" to track a new activation or seat being used.',
    'Use "decrease" when a seat is released or an activation is deregistered.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      licenseKey: z.string().describe('The license key whose usage count should be updated'),
      action: z
        .enum(['increase', 'decrease'])
        .describe('Whether to increment or decrement the usage counter')
    })
  )
  .output(
    z.object({
      enabled: z.boolean().describe('Whether the license key is currently active'),
      licenseKey: z.string().describe('The license key that was modified'),
      productLink: z.string().describe('Unique product identifier'),
      buyerEmail: z.string().describe('Email address of the buyer'),
      uses: z.number().describe('Updated usage count for the license'),
      productName: z.string().describe('Name of the associated product'),
      date: z.string().describe('Date the license was created')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.productSecretKey) {
      throw new Error(
        'Product secret key is required for license key operations. Please configure it in your authentication settings.'
      );
    }

    let client = new LicenseClient({ productSecretKey: ctx.auth.productSecretKey });

    let license =
      ctx.input.action === 'increase'
        ? await client.increaseUsage(ctx.input.licenseKey)
        : await client.decreaseUsage(ctx.input.licenseKey);

    return {
      output: license,
      message: `License usage ${ctx.input.action}d to **${license.uses}** for product "${license.productName}" (buyer: ${license.buyerEmail}).`
    };
  })
  .build();
