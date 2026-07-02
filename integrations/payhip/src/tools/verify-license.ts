import { SlateTool } from 'slates';
import { z } from 'zod';
import { LicenseClient } from '../lib/client';
import { spec } from '../spec';

export let verifyLicense = SlateTool.create(spec, {
  name: 'Verify License Key',
  key: 'verify_license',
  description: `Verifies whether a customer's license key is valid and retrieves associated purchase details including buyer email, product name, enabled status, and usage count.
Requires the **product secret key** to be configured in the authentication settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      licenseKey: z.string().describe('The license key to verify')
    })
  )
  .output(
    z.object({
      enabled: z.boolean().describe('Whether the license key is currently active'),
      licenseKey: z.string().describe('The verified license key'),
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

    let license = await client.verifyLicense(ctx.input.licenseKey);

    return {
      output: license,
      message: `License key is **${license.enabled ? 'enabled' : 'disabled'}** for product "${license.productName}" (buyer: ${license.buyerEmail}, uses: ${license.uses}).`
    };
  })
  .build();
