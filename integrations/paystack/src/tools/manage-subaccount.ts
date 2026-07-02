import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { spec } from '../spec';

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
  .output(
    z.object({
      subaccountCode: z.string().describe('Subaccount code for use in transactions'),
      subaccountId: z.number().describe('Subaccount ID'),
      businessName: z.string().describe('Business name'),
      percentageCharge: z.number().describe('Charge percentage'),
      settlementBank: z.string().describe('Settlement bank')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.createSubaccount({
      businessName: ctx.input.businessName,
      settlementBank: ctx.input.settlementBank,
      accountNumber: ctx.input.accountNumber,
      percentageCharge: ctx.input.percentageCharge,
      description: ctx.input.description,
      primaryContactEmail: ctx.input.primaryContactEmail,
      primaryContactName: ctx.input.primaryContactName,
      primaryContactPhone: ctx.input.primaryContactPhone,
      metadata: ctx.input.metadata
    });

    let sub = result.data;

    return {
      output: {
        subaccountCode: sub.subaccount_code,
        subaccountId: sub.id,
        businessName: sub.business_name,
        percentageCharge: sub.percentage_charge,
        settlementBank: sub.settlement_bank
      },
      message: `Subaccount **${sub.business_name}** created (${sub.subaccount_code}) with ${sub.percentage_charge}% charge.`
    };
  })
  .build();

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
  .output(
    z.object({
      subaccounts: z.array(
        z.object({
          subaccountCode: z.string().describe('Subaccount code'),
          subaccountId: z.number().describe('Subaccount ID'),
          businessName: z.string().describe('Business name'),
          percentageCharge: z.number().describe('Charge percentage'),
          active: z.boolean().describe('Whether active')
        })
      ),
      totalCount: z.number().describe('Total subaccounts'),
      currentPage: z.number().describe('Current page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.listSubaccounts({
      perPage: ctx.input.perPage,
      page: ctx.input.page,
      from: ctx.input.from,
      to: ctx.input.to
    });

    let subaccounts = (result.data ?? []).map((s: any) => ({
      subaccountCode: s.subaccount_code,
      subaccountId: s.id,
      businessName: s.business_name,
      percentageCharge: s.percentage_charge,
      active: s.active ?? true
    }));

    let meta = result.meta ?? {};

    return {
      output: {
        subaccounts,
        totalCount: meta.total ?? 0,
        currentPage: meta.page ?? 1,
        totalPages: meta.pageCount ?? 1
      },
      message: `Found **${meta.total ?? subaccounts.length}** subaccounts.`
    };
  })
  .build();
