import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let newVoucher = SlateTrigger.create(spec, {
  name: 'New Voucher',
  key: 'new_voucher',
  description: 'Triggers when a new voucher (incoming invoice/receipt) is created in sevDesk.'
})
  .input(
    z.object({
      voucherId: z.string().describe('Voucher ID'),
      voucherData: z.any().describe('Full voucher data from sevDesk')
    })
  )
  .output(
    z.object({
      voucherId: z.string().describe('Voucher ID'),
      voucherNumber: z.string().optional(),
      description: z.string().optional(),
      voucherDate: z.string().optional(),
      status: z.string().optional(),
      totalNet: z.string().optional(),
      totalGross: z.string().optional(),
      supplierContactId: z.string().optional(),
      creditDebit: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new SevdeskClient({ token: ctx.auth.token });

      let lastSeenId: string | undefined = ctx.state?.lastSeenId;

      let vouchers = await client.listVouchers({
        limit: 50,
        offset: 0
      });

      let sorted = (vouchers ?? []).sort((a: any, b: any) => Number(b.id) - Number(a.id));

      let newVouchers: any[] = [];
      for (let v of sorted) {
        let vId = String(v.id);
        if (lastSeenId && Number(vId) <= Number(lastSeenId)) break;
        newVouchers.push(v);
      }

      let updatedLastSeenId = sorted.length > 0 ? String(sorted[0].id) : lastSeenId;

      return {
        inputs: newVouchers.map((v: any) => ({
          voucherId: String(v.id),
          voucherData: v
        })),
        updatedState: {
          lastSeenId: updatedLastSeenId
        }
      };
    },

    handleEvent: async ctx => {
      let v = ctx.input.voucherData;

      return {
        type: 'voucher.created',
        id: ctx.input.voucherId,
        output: {
          voucherId: ctx.input.voucherId,
          voucherNumber: v.voucherNumber ?? undefined,
          description: v.description ?? undefined,
          voucherDate: v.voucherDate ?? undefined,
          status: v.status != null ? String(v.status) : undefined,
          totalNet: v.sumNet ?? undefined,
          totalGross: v.sumGross ?? undefined,
          supplierContactId: v.supplier?.id ? String(v.supplier.id) : undefined,
          creditDebit: v.creditDebit ?? undefined,
          createdAt: v.create ?? undefined
        }
      };
    }
  })
  .build();
