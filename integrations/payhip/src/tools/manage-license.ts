import { SlateTool } from 'slates';
import { z } from 'zod';
import { LicenseClient } from '../lib/client';
import { spec } from '../spec';

export let manageLicense = SlateTool.create(spec, {
  name: 'Manage License Key',
  key: 'manage_license',
  description: `Enables or disables a customer's license key. Use this to control access to your software product.
License keys are automatically disabled on refund. You may also disable keys for terms of service violations.
Requires the **product secret key** to be configured in the authentication settings.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      licenseKey: z.string().describe('The license key to enable or disable'),
      action: z
        .enum(['enable', 'disable'])
        .describe('Whether to enable or disable the license key')
    })
  )
  .output(
    z.object({
      enabled: z
        .boolean()
        .describe('Whether the license key is currently active after the operation'),
      licenseKey: z.string().describe('The license key that was modified'),
      productLink: z.string().describe('Unique product identifier'),
      buyerEmail: z.string().describe('Email address of the buyer'),
      uses: z.number().describe('Current usage count for the license'),
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
      ctx.input.action === 'enable'
        ? await client.enableLicense(ctx.input.licenseKey)
        : await client.disableLicense(ctx.input.licenseKey);

    return {
      output: license,
      message: `License key has been **${ctx.input.action}d** for product "${license.productName}" (buyer: ${license.buyerEmail}).`
    };
  })
  .build();
