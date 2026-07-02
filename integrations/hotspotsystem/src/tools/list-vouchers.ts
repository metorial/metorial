import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let voucherSchema = z.object({
  serial: z.string().describe('Voucher serial number'),
  voucherCode: z.string().describe('Voucher access code'),
  trafficLimitTotal: z.string().describe('Total traffic limit in bytes'),
  trafficLimitDownload: z.string().describe('Download traffic limit in bytes'),
  trafficLimitUpload: z.string().describe('Upload traffic limit in bytes'),
  simultaneousUse: z.string().describe('Number of simultaneous uses allowed'),
  usageExpiration: z.string().describe('Usage expiration value'),
  validity: z.string().describe('Validity period in minutes'),
  price: z.string().describe('End-user price'),
  currency: z.string().describe('Price currency')
});

export let listVouchers = SlateTool.create(spec, {
  name: 'List Vouchers',
  key: 'list_vouchers',
  description: `Retrieve voucher/access code records from your hotspot locations. Each voucher includes its code, traffic limits, validity period, pricing, and simultaneous use settings. Can be filtered by location.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      locationId: z
        .string()
        .optional()
        .describe(
          'Filter vouchers by a specific location ID. Omit to retrieve across all locations.'
        ),
      limit: z.number().optional().describe('Maximum number of vouchers to return per page'),
      offset: z.number().optional().describe('Zero-based page offset for pagination'),
      sort: z
        .string()
        .optional()
        .describe('Property to sort by; prefix with - for descending order')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of vouchers matching the query'),
      vouchers: z.array(voucherSchema).describe('List of voucher records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getVouchers({
      locationId: ctx.input.locationId,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort
    });

    let vouchers = (result.items ?? []).map(v => ({
      serial: v.serial ?? '',
      voucherCode: v.voucher_code ?? '',
      trafficLimitTotal: v.limit_tl ?? '',
      trafficLimitDownload: v.limit_dl ?? '',
      trafficLimitUpload: v.limit_ul ?? '',
      simultaneousUse: v.simultaneous_use ?? '',
      usageExpiration: v.usage_exp ?? '',
      validity: v.validity ?? '',
      price: v.price_enduser ?? '',
      currency: v.currency ?? ''
    }));

    let locationLabel = ctx.input.locationId
      ? ` for location ${ctx.input.locationId}`
      : ' across all locations';
    return {
      output: {
        totalCount: result.metadata.total_count,
        vouchers
      },
      message: `Retrieved ${vouchers.length} vouchers${locationLabel} (${result.metadata.total_count} total).`
    };
  })
  .build();
