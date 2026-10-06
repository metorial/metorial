import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';

import {
  exactId,
  observedFlag,
  optionalNumericId,
  pagination,
  record,
  records,
  validateOutput
} from '../lib/transport';
import { spec } from '../spec';

const createSubaccountOutput = z.object({
  subaccountCode: z.string().describe('Subaccount code for use in transactions'),
  subaccountId: z.number().optional().describe('Subaccount ID'),
  exactSubaccountId: z
    .string()
    .describe(
      'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
    ),
  businessName: z.string().describe('Business name'),
  percentageCharge: z.number().describe('Charge percentage'),
  settlementBank: z.string().describe('Settlement bank')
});

export let createSubaccount = SlateTool.create(spec, {
  name: 'Create Subaccount',
  key: 'create_subaccount',
  description: `Create a subaccount for splitting payments. Subaccounts represent third-party businesses or vendors that receive a portion of each transaction.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      businessName: z.string().describe('Business name for the subaccount'),
      settlementBank: z.string().describe('Bank code for settlement'),
      accountNumber: z.string().describe('Bank account number'),
      percentageCharge: z.number().describe('Percentage of transaction to charge (0-100)'),
      description: z.string().optional().describe('Subaccount description'),
      primaryContactEmail: z.string().optional().describe('Primary contact email'),
      primaryContactName: z.string().optional().describe('Primary contact name'),
      primaryContactPhone: z.string().optional().describe('Primary contact phone'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata')
    })
  )
  .output(createSubaccountOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.createSubaccount(ctx.input);
    const sub = record(result.data);
    const output = {
      subaccountCode: sub.subaccount_code,
      subaccountId: optionalNumericId(sub.id),
      exactSubaccountId: exactId(sub.id),
      businessName: sub.business_name,
      percentageCharge: sub.percentage_charge,
      settlementBank: sub.settlement_bank
    };
    return {
      output: validateOutput(createSubaccountOutput, output),
      message: 'Settlement subaccount created; this configures a payment beneficiary.'
    };
  })
  .build();
const listSubaccountsOutput = z.object({
  subaccounts: z.array(
    z.object({
      subaccountCode: z.string().describe('Subaccount code'),
      subaccountId: z.number().optional().describe('Subaccount ID'),
      exactSubaccountId: z
        .string()
        .describe(
          'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
        ),
      businessName: z.string().describe('Business name'),
      percentageCharge: z.number().describe('Charge percentage'),
      active: z.boolean().describe('Whether active')
    })
  ),
  totalCount: z.number().optional().describe('Total subaccounts'),
  currentPage: z.number().optional().describe('Current page'),
  totalPages: z.number().optional().describe('Total pages'),
  nextCursor: z.string().nullable().optional().describe('Provider next cursor, when returned'),
  previousCursor: z
    .string()
    .nullable()
    .optional()
    .describe('Provider previous cursor, when returned'),
  perPage: z.number().optional().describe('Observed provider page size')
});

export let listSubaccounts = SlateTool.create(spec, {
  name: 'List Subaccounts',
  key: 'list_subaccounts',
  description: `Retrieve a paginated list of subaccounts on your integration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      perPage: z.number().optional().describe('Records per page'),
      page: z.number().optional().describe('Page number'),
      from: z.string().optional().describe('Start date (ISO 8601)'),
      to: z.string().optional().describe('End date (ISO 8601)')
    })
  )
  .output(listSubaccountsOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.listSubaccounts(ctx.input);
    const output = {
      subaccounts: records(result.data).map(item => ({
        subaccountCode: item.subaccount_code,
        subaccountId: optionalNumericId(item.id),
        exactSubaccountId: exactId(item.id),
        businessName: item.business_name,
        percentageCharge: item.percentage_charge,
        active: observedFlag(item.active)
      })),
      ...pagination(result.meta)
    };
    return {
      output: validateOutput(listSubaccountsOutput, output),
      message:
        'Retrieved the requested page; continuation and counts are included only when returned by Paystack.'
    };
  })
  .build();
