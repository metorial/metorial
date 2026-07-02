import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageLicenses = SlateTool.create(spec, {
  name: 'Manage Licenses',
  key: 'manage_licenses',
  description: `Assign, get, or revoke Google Workspace product licenses for users. Supports managing licenses for products like Google Workspace Business, Enterprise, and other Google products.`,
  instructions: [
    'Common product IDs: "Google-Apps" (Workspace), "101031" (Drive storage), "101037" (Vault).',
    'SKU IDs vary by product tier: e.g. "Google-Apps-For-Business", "Google-Apps-Unlimited", "1010310004" (20GB Drive).'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.manageLicenses)
  .input(
    z.object({
      action: z.enum(['list', 'get', 'assign', 'revoke']).describe('Action to perform'),
      productId: z.string().describe('Product ID (e.g. "Google-Apps")'),
      skuId: z.string().optional().describe('SKU ID (required for get, assign, revoke)'),
      userId: z.string().optional().describe('User email (required for get, assign, revoke)'),
      maxResults: z.number().optional(),
      pageToken: z.string().optional()
    })
  )
  .output(
    z.object({
      licenses: z
        .array(
          z.object({
            productId: z.string().optional(),
            skuId: z.string().optional(),
            skuName: z.string().optional(),
            userId: z.string().optional()
          })
        )
        .optional(),
      license: z
        .object({
          productId: z.string().optional(),
          skuId: z.string().optional(),
          skuName: z.string().optional(),
          userId: z.string().optional()
        })
        .optional(),
      revoked: z.boolean().optional(),
      nextPageToken: z.string().optional(),
      action: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    let customerId = ctx.config.customerId || 'my_customer';

    if (ctx.input.action === 'list') {
      let result = await client.listLicenseAssignments(
        ctx.input.productId,
        customerId,
        ctx.input.skuId,
        {
          maxResults: ctx.input.maxResults,
          pageToken: ctx.input.pageToken
        }
      );

      let licenses = (result.items || []).map((l: any) => ({
        productId: l.productId,
        skuId: l.skuId,
        skuName: l.skuName,
        userId: l.userId
      }));

      return {
        output: { licenses, nextPageToken: result.nextPageToken, action: 'list' },
        message: `Found **${licenses.length}** license assignments for product **${ctx.input.productId}**.`
      };
    }

    if (!ctx.input.skuId || !ctx.input.userId) {
      throw new Error('skuId and userId are required for get/assign/revoke');
    }

    if (ctx.input.action === 'get') {
      let l = await client.getLicenseAssignment(
        ctx.input.productId,
        ctx.input.skuId,
        ctx.input.userId
      );
      return {
        output: {
          license: {
            productId: l.productId,
            skuId: l.skuId,
            skuName: l.skuName,
            userId: l.userId
          },
          action: 'get'
        },
        message: `Retrieved license **${l.skuName || l.skuId}** for user **${l.userId}**.`
      };
    }

    if (ctx.input.action === 'assign') {
      let l = await client.assignLicense(
        ctx.input.productId,
        ctx.input.skuId,
        ctx.input.userId
      );
      return {
        output: {
          license: {
            productId: l.productId,
            skuId: l.skuId,
            skuName: l.skuName,
            userId: l.userId
          },
          action: 'assign'
        },
        message: `Assigned license **${l.skuName || l.skuId}** to user **${l.userId}**.`
      };
    }

    // revoke
    await client.revokeLicense(ctx.input.productId, ctx.input.skuId, ctx.input.userId);
    return {
      output: { revoked: true, action: 'revoke' },
      message: `Revoked license **${ctx.input.skuId}** from user **${ctx.input.userId}**.`
    };
  })
  .build();
