import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';

export let manageLicense = SlateTool.create(spec, {
  name: 'Manage License',
  key: 'manage_license',
  description: `Verify, enable, disable, or decrement uses for a Gumroad license key. Used for gating access to software or premium content.`,
  instructions: [
    'Use "verify" to check if a license key is valid and optionally increment its use count.',
    'Use "enable" to re-enable a previously disabled license.',
    'Use "disable" to prevent a license key from being used.',
    'Use "decrement_uses" to reduce the usage count by one.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['verify', 'enable', 'disable', 'decrement_uses'])
        .describe('Action to perform on the license'),
      productPermalink: z.string().describe('Product permalink (short URL slug)'),
      licenseKey: z.string().describe('The license key to manage'),
      incrementUsesCount: z
        .boolean()
        .optional()
        .describe('Whether to increment the use count when verifying (default: true)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      uses: z.number().optional().describe('Current number of uses'),
      purchaseEmail: z.string().optional().describe('Email of the buyer'),
      purchaseId: z.string().optional().describe('Purchase/sale ID'),
      createdAt: z.string().optional().describe('Purchase creation timestamp'),
      variants: z.any().optional().describe('Selected variant options'),
      customFields: z.any().optional().describe('Custom field values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let { action, productPermalink, licenseKey } = ctx.input;

    let result: any;

    if (action === 'verify') {
      result = await client.verifyLicense(
        productPermalink,
        licenseKey,
        ctx.input.incrementUsesCount
      );
    } else if (action === 'enable') {
      result = await client.enableLicense(productPermalink, licenseKey);
    } else if (action === 'disable') {
      result = await client.disableLicense(productPermalink, licenseKey);
    } else if (action === 'decrement_uses') {
      result = await client.decrementLicenseUsesCount(productPermalink, licenseKey);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    let purchase = result.purchase || {};

    return {
      output: {
        success: result.success,
        uses: result.uses,
        purchaseEmail: purchase.email || undefined,
        purchaseId: purchase.id || undefined,
        createdAt: purchase.created_at || undefined,
        variants: purchase.variants || undefined,
        customFields: purchase.custom_fields || undefined
      },
      message: `License ${action} **${result.success ? 'succeeded' : 'failed'}**. Uses: ${result.uses ?? 'N/A'}.`
    };
  })
  .build();
