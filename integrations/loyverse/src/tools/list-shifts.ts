import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, joinIds } from '../lib/client';
import { spec } from '../spec';

let shiftSchema = z.object({
  shiftId: z.string().describe('Shift ID'),
  storeId: z.string().optional().describe('Store ID'),
  posDeviceId: z.string().nullable().optional().describe('POS device ID'),
  employeeId: z
    .string()
    .nullable()
    .optional()
    .describe('Employee ID who opened the shift (same as openedByEmployeeId)'),
  openedByEmployeeId: z
    .string()
    .nullable()
    .optional()
    .describe('Employee ID who opened the shift'),
  closedByEmployeeId: z
    .string()
    .nullable()
    .optional()
    .describe('Employee ID who closed the shift'),
  openedAt: z.string().optional().describe('Shift open time'),
  closedAt: z.string().nullable().optional().describe('Shift close time'),
  startingCash: z.number().nullable().optional().describe('Cash at the start of the shift'),
  cashPaymentsAmount: z
    .number()
    .nullable()
    .optional()
    .describe('Total cash payments during shift'),
  cashRefunds: z.number().nullable().optional().describe('Total cash refunds during shift'),
  paidIn: z.number().nullable().optional().describe('Money added to the cash drawer'),
  paidOut: z.number().nullable().optional().describe('Money removed from the cash drawer'),
  expectedCashAmount: z.number().nullable().optional().describe('Expected cash in drawer'),
  actualCash: z.number().nullable().optional().describe('Actual cash counted at close'),
  grossSales: z.number().nullable().optional().describe('Gross sales during shift'),
  refunds: z.number().nullable().optional().describe('Total refunds during shift'),
  discounts: z.number().nullable().optional().describe('Total discounts during shift'),
  netSales: z.number().nullable().optional().describe('Net sales during shift'),
  tip: z.number().nullable().optional().describe('Total tips during shift'),
  surcharge: z.number().nullable().optional().describe('Total surcharge during shift'),
  taxes: z
    .array(
      z.object({
        taxId: z.string().nullable().optional().describe('Tax ID'),
        moneyAmount: z.number().nullable().optional().describe('Tax total for the shift')
      })
    )
    .optional()
    .describe('Tax totals'),
  payments: z
    .array(
      z.object({
        paymentTypeId: z.string().nullable().optional().describe('Payment type ID'),
        moneyAmount: z.number().nullable().optional().describe('Payment total for the shift')
      })
    )
    .optional()
    .describe('Totals per payment type'),
  cashMovements: z
    .array(
      z.object({
        type: z.string().nullable().optional().describe('PAY_IN or PAY_OUT'),
        moneyAmount: z.number().nullable().optional().describe('Amount moved'),
        comment: z.string().nullable().optional().describe('Comment'),
        employeeId: z.string().nullable().optional().describe('Employee ID'),
        createdAt: z.string().nullable().optional().describe('Movement time')
      })
    )
    .optional()
    .describe('Cash drawer movements'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let listShifts = SlateTool.create(spec, {
  name: 'List Shifts',
  key: 'list_shifts',
  description: `Retrieve closed cash register shifts, newest first, including open/close times, cash drawer totals, sales totals, and the employees who opened and closed them. Filter by store or by the time the shift was opened.`,
  instructions: [
    'employeeId filtering is applied to the returned page only; keep paging with the cursor to scan more shifts.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().min(1).max(250).optional().describe('Number of shifts to return'),
      cursor: z.string().optional().describe('Pagination cursor'),
      storeId: z.string().optional().describe('Filter by store ID'),
      storeIds: z.array(z.string()).optional().describe('Filter by several store IDs'),
      employeeId: z
        .string()
        .optional()
        .describe(
          'Only keep shifts opened or closed by this employee (applied to the returned page)'
        ),
      createdAtMin: z
        .string()
        .optional()
        .describe('Only return shifts opened at or after this ISO 8601 UTC timestamp'),
      createdAtMax: z
        .string()
        .optional()
        .describe('Only return shifts opened at or before this ISO 8601 UTC timestamp')
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
      storeIds: joinIds(ctx.input.storeId, ctx.input.storeIds),
      createdAtMin: ctx.input.createdAtMin,
      createdAtMax: ctx.input.createdAtMax
    });

    let employeeId = ctx.input.employeeId;
    let shifts = (result.shifts ?? [])
      .filter(
        (s: any) =>
          !employeeId ||
          s.opened_by_employee === employeeId ||
          s.closed_by_employee === employeeId
      )
      .map((s: any) => ({
        shiftId: s.id,
        storeId: s.store_id,
        posDeviceId: s.pos_device_id,
        employeeId: s.opened_by_employee ?? s.employee_id,
        openedByEmployeeId: s.opened_by_employee,
        closedByEmployeeId: s.closed_by_employee,
        openedAt: s.opened_at,
        closedAt: s.closed_at,
        startingCash: s.starting_cash,
        cashPaymentsAmount: s.cash_payments,
        cashRefunds: s.cash_refunds,
        paidIn: s.paid_in,
        paidOut: s.paid_out,
        expectedCashAmount: s.expected_cash,
        actualCash: s.actual_cash,
        grossSales: s.gross_sales,
        refunds: s.refunds,
        discounts: s.discounts,
        netSales: s.net_sales,
        tip: s.tip,
        surcharge: s.surcharge,
        taxes: s.taxes?.map((t: any) => ({
          taxId: t.tax_id,
          moneyAmount: t.money_amount
        })),
        payments: s.payments?.map((p: any) => ({
          paymentTypeId: p.payment_type_id,
          moneyAmount: p.money_amount
        })),
        cashMovements: s.cash_movements?.map((m: any) => ({
          type: m.type,
          moneyAmount: m.money_amount,
          comment: m.comment,
          employeeId: m.employee_id,
          createdAt: m.created_at
        })),
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }));

    return {
      output: { shifts, cursor: result.cursor },
      message: `Retrieved **${shifts.length}** shift(s).${result.cursor ? ' More available via cursor.' : ''}`
    };
  })
  .build();
