import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { gumroadServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageLicense = SlateTool.create(spec, {
  name: 'Manage License',
  key: 'manage_license',
  description: `Verify, enable, disable, decrement uses, or rotate a Gumroad license key. Used for gating access to software or premium content.`,
  instructions: [
    'Use "verify" to check if a license key is valid and optionally increment its use count.',
    'Use "enable" to re-enable a previously disabled license.',
    'Use "disable" to prevent a license key from being used.',
    'Use "decrement_uses" to reduce the usage count by one.',
    'Use "rotate" to issue a new license key for the purchase.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['verify', 'enable', 'disable', 'decrement_uses', 'rotate'])
        .describe('Action to perform on the license'),
      productId: z
        .string()
        .describe('Product ID from Gumroad. Required by the current Gumroad license API.'),
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
      licenseKey: z.string().optional().describe('License key returned by Gumroad'),
      createdAt: z.string().optional().describe('Purchase creation timestamp'),
      variants: z.any().optional().describe('Selected variant options'),
      customFields: z.any().optional().describe('Custom field values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let { action, licenseKey } = ctx.input;
    let productId = ctx.input.productId;

    let result: any;

    if (action === 'verify') {
      result = await client.verifyLicense(productId, licenseKey, ctx.input.incrementUsesCount);
    } else if (action === 'enable') {
      result = await client.enableLicense(productId, licenseKey);
    } else if (action === 'disable') {
      result = await client.disableLicense(productId, licenseKey);
    } else if (action === 'decrement_uses') {
      result = await client.decrementLicenseUsesCount(productId, licenseKey);
    } else if (action === 'rotate') {
      result = await client.rotateLicense(productId, licenseKey);
    } else {
      throw gumroadServiceError(`Unknown action: ${action}`);
    }

    let purchase = result.purchase || {};

    return {
      output: {
        success: result.success,
        uses: result.uses,
        purchaseEmail: purchase.email || undefined,
        purchaseId: purchase.id || purchase.sale_id || undefined,
        licenseKey: purchase.license_key || result.license_key || undefined,
        createdAt: purchase.created_at || undefined,
        variants: purchase.variants || undefined,
        customFields: purchase.custom_fields || undefined
      },
      message: `License ${action} **${result.success ? 'succeeded' : 'failed'}**. Uses: ${result.uses ?? 'N/A'}.`
    };
  })
  .build();
