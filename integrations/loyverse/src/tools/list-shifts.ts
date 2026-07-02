import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let shiftSchema = z.object({
  shiftId: z.string().describe('Shift ID'),
  storeId: z.string().optional().describe('Store ID'),
  employeeId: z.string().nullable().optional().describe('Employee ID'),
  openedAt: z.string().optional().describe('Shift open time'),
  closedAt: z.string().nullable().optional().describe('Shift close time'),
  cashPaymentsAmount: z.number().optional().describe('Total cash payments during shift'),
  expectedCashAmount: z.number().optional().describe('Expected cash in drawer'),
  grossSales: z.number().optional().describe('Gross sales during shift'),
  refunds: z.number().optional().describe('Total refunds during shift'),
  netSales: z.number().optional().describe('Net sales during shift'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let listShifts = SlateTool.create(spec, {
  name: 'List Shifts',
  key: 'list_shifts',
  description: `Retrieve shift records including open/close times, sales totals, and associated employee information. Can filter by store or employee.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().min(1).max(250).optional(),
      cursor: z.string().optional(),
      storeId: z.string().optional().describe('Filter by store ID'),
      employeeId: z.string().optional().describe('Filter by employee ID')
    })
  )
  .output(
    z.object({
      shifts: z.array(shiftSchema),
      cursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listShifts({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      storeId: ctx.input.storeId,
      employeeId: ctx.input.employeeId
    });

    let shifts = (result.shifts ?? []).map((s: any) => ({
      shiftId: s.id,
      storeId: s.store_id,
      employeeId: s.employee_id,
      openedAt: s.opened_at,
      closedAt: s.closed_at,
      cashPaymentsAmount: s.cash_payments_amount,
      expectedCashAmount: s.expected_cash_amount,
      grossSales: s.gross_sales,
      refunds: s.refunds,
      netSales: s.net_sales,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    return {
      output: { shifts, cursor: result.cursor },
      message: `Retrieved **${shifts.length}** shift(s).`
    };
  })
  .build();
