import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let voucherSchema = z
  .object({
    voucherUuid: z.string().optional().describe('UUID of the voucher'),
    code: z.string().optional().describe('Voucher code'),
    status: z
      .string()
      .optional()
      .describe('Voucher status (ACTIVE, REDEEMED, EXPIRED, DEACTIVATED, INACTIVE, LOCKED)'),
    promotionUuid: z.string().optional().describe('UUID of the associated promotion'),
    contactUuid: z.string().optional().describe('UUID of the linked contact'),
    expirationDate: z.string().optional().describe('Expiration date'),
    activationDate: z.string().optional().describe('Activation date'),
    createdAt: z.string().optional().describe('Creation timestamp')
  })
  .passthrough();

export let manageVouchers = SlateTool.create(spec, {
  name: 'Manage Vouchers',
  key: 'manage_vouchers',
  description: `Create, list, find, update, or redeem vouchers. Vouchers are tied to promotions and can be assigned to contacts. Use this tool to manage the entire voucher lifecycle.`,
  instructions: [
    'Use action "create" to generate a new voucher for a promotion.',
    'Use action "find" to look up a voucher by its code.',
    'Use action "redeem" to redeem a voucher at a shop.',
    'A voucher code is auto-generated if not provided during creation.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'find', 'create', 'update', 'redeem'])
        .describe('Action to perform'),
      // List params
      promotionUuid: z
        .string()
        .optional()
        .describe('Filter/assign by promotion UUID (required for create)'),
      contactUuid: z.string().optional().describe('Filter by or assign to contact UUID'),
      status: z
        .enum(['ACTIVE', 'REDEEMED', 'EXPIRED', 'DEACTIVATED', 'INACTIVE', 'LOCKED'])
        .optional()
        .describe('Filter by or set voucher status'),
      limit: z.number().optional().describe('Number of vouchers per page for list'),
      page: z.number().optional().describe('Page number for list'),
      // Find/redeem params
      code: z.string().optional().describe('Voucher code (required for find and redeem)'),
      // Create params
      expirationDate: z.string().optional().describe('Expiration date (ISO 8601)'),
      activationDate: z.string().optional().describe('Activation date (ISO 8601)'),
      totalRedemptionsAllowed: z.number().optional().describe('Maximum number of redemptions'),
      // Update params
      voucherUuid: z.string().optional().describe('UUID of the voucher to update'),
      // Redeem params
      shopUuid: z.string().optional().describe('Shop UUID for redemption')
    })
  )
  .output(
    z.object({
      voucher: voucherSchema.optional().describe('Single voucher result'),
      vouchers: z.array(voucherSchema).optional().describe('List of vouchers'),
      totalCount: z.number().optional().describe('Total count for list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listVouchers({
        promotionUuid: ctx.input.promotionUuid,
        contactUuid: ctx.input.contactUuid,
        status: ctx.input.status,
        limit: ctx.input.limit,
        page: ctx.input.page
      });
      let vouchers = (result.data || []).map((v: any) => ({
        voucherUuid: v.uuid,
        code: v.code,
        status: v.status,
        promotionUuid: v.promotion?.uuid,
        contactUuid: v.contact?.uuid,
        expirationDate: v.expiration_date,
        activationDate: v.activation_date,
        createdAt: v.created_at,
        ...v
      }));
      return {
        output: { vouchers, totalCount: result.meta?.total },
        message: `Retrieved **${vouchers.length}** voucher(s).`
      };
    }

    if (action === 'find') {
      if (!ctx.input.code) throw new Error('code is required for find');
      let result = await client.findVoucher(ctx.input.code);
      let v = result.data || result;
      return {
        output: {
          voucher: {
            voucherUuid: v.uuid,
            code: v.code,
            status: v.status,
            promotionUuid: v.promotion?.uuid,
            contactUuid: v.contact?.uuid,
            expirationDate: v.expiration_date,
            ...v
          }
        },
        message: `Found voucher with code **${ctx.input.code}** (status: ${v.status}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.promotionUuid) throw new Error('promotionUuid is required for create');
      let result = await client.createVoucher({
        promotionUuid: ctx.input.promotionUuid,
        code: ctx.input.code,
        contactUuid: ctx.input.contactUuid,
        expirationDate: ctx.input.expirationDate,
        activationDate: ctx.input.activationDate,
        totalRedemptionsAllowed: ctx.input.totalRedemptionsAllowed
      });
      let v = result.data || result;
      return {
        output: {
          voucher: {
            voucherUuid: v.uuid,
            code: v.code,
            status: v.status,
            promotionUuid: v.promotion?.uuid || ctx.input.promotionUuid,
            contactUuid: v.contact?.uuid,
            expirationDate: v.expiration_date,
            createdAt: v.created_at,
            ...v
          }
        },
        message: `Created voucher **${v.code}** for promotion ${ctx.input.promotionUuid}.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.voucherUuid) throw new Error('voucherUuid is required for update');
      let result = await client.updateVoucher(ctx.input.voucherUuid, {
        status: ctx.input.status as 'ACTIVE' | 'DEACTIVATED' | undefined,
        expirationDate: ctx.input.expirationDate
      });
      let v = result.data || result;
      return {
        output: {
          voucher: {
            voucherUuid: v.uuid || ctx.input.voucherUuid,
            code: v.code,
            status: v.status,
            ...v
          }
        },
        message: `Updated voucher **${ctx.input.voucherUuid}**.`
      };
    }

    // redeem
    if (!ctx.input.code) throw new Error('code is required for redeem');
    let shopUuid = ctx.input.shopUuid || ctx.config.shopUuid;
    if (!shopUuid) throw new Error('shopUuid is required for redeem');
    let result = await client.redeemVoucher({
      code: ctx.input.code,
      shopUuid,
      contactUuid: ctx.input.contactUuid
    });
    let v = result.data || result;
    return {
      output: {
        voucher: {
          voucherUuid: v.uuid,
          code: v.code || ctx.input.code,
          status: v.status || 'REDEEMED',
          ...v
        }
      },
      message: `Redeemed voucher **${ctx.input.code}** at shop ${shopUuid}.`
    };
  })
  .build();
