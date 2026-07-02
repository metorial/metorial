import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLicenseKeyTool = SlateTool.create(spec, {
  name: 'Manage License Key',
  key: 'manage_license_key',
  description: `Retrieve or update a license key. Use the **action** field to get details or modify activation limits, expiration, and disabled status. Also lists activation instances when retrieving.`,
  instructions: [
    'Use action "get" to retrieve a license key and its activation instances.',
    'Use action "update" to modify the license key settings.'
  ]
})
  .input(
    z.object({
      licenseKeyId: z.string().describe('The ID of the license key'),
      action: z.enum(['get', 'update']).describe('The action to perform'),
      activationLimit: z
        .number()
        .optional()
        .describe('Maximum number of activations allowed (for "update" action)'),
      disabled: z
        .boolean()
        .optional()
        .describe('Whether the license key is disabled (for "update" action)'),
      expiresAt: z
        .string()
        .optional()
        .describe('ISO 8601 expiration date (for "update" action)')
    })
  )
  .output(
    z.object({
      licenseKeyId: z.string(),
      storeId: z.number(),
      customerId: z.number(),
      orderId: z.number(),
      productId: z.number(),
      orderItemId: z.number(),
      key: z.string(),
      keyShort: z.string(),
      status: z.string(),
      statusFormatted: z.string(),
      activationLimit: z.number(),
      activationUsage: z.number(),
      disabled: z.boolean(),
      expiresAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      instances: z
        .array(
          z.object({
            instanceId: z.string(),
            identifier: z.string(),
            name: z.string(),
            createdAt: z.string()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { licenseKeyId, action } = ctx.input;
    let response: any;

    if (action === 'update') {
      let attributes: Record<string, unknown> = {};
      if (ctx.input.activationLimit !== undefined)
        attributes.activation_limit = ctx.input.activationLimit;
      if (ctx.input.disabled !== undefined) attributes.disabled = ctx.input.disabled;
      if (ctx.input.expiresAt !== undefined) attributes.expires_at = ctx.input.expiresAt;
      response = await client.updateLicenseKey(licenseKeyId, attributes);
    } else {
      response = await client.getLicenseKey(licenseKeyId);
    }

    let lk = response.data;
    let attrs = lk.attributes;

    let instances: any[] | undefined;
    if (action === 'get') {
      let instancesResponse = await client.listLicenseKeyInstances({ licenseKeyId });
      instances = (instancesResponse.data || []).map((inst: any) => ({
        instanceId: inst.id,
        identifier: inst.attributes.identifier,
        name: inst.attributes.name,
        createdAt: inst.attributes.created_at
      }));
    }

    let output = {
      licenseKeyId: lk.id,
      storeId: attrs.store_id,
      customerId: attrs.customer_id,
      orderId: attrs.order_id,
      productId: attrs.product_id,
      orderItemId: attrs.order_item_id,
      key: attrs.key,
      keyShort: attrs.key_short,
      status: attrs.status,
      statusFormatted: attrs.status_formatted,
      activationLimit: attrs.activation_limit,
      activationUsage: attrs.activation_usage,
      disabled: attrs.disabled,
      expiresAt: attrs.expires_at,
      createdAt: attrs.created_at,
      updatedAt: attrs.updated_at,
      instances
    };

    let actionLabel = action === 'get' ? 'Retrieved' : 'Updated';

    return {
      output,
      message: `${actionLabel} license key **${attrs.key_short}** — status: ${attrs.status_formatted}, activations: ${attrs.activation_usage}/${attrs.activation_limit}.`
    };
  })
  .build();
