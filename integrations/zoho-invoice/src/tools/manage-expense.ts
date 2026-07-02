import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageExpense = SlateTool.create(spec, {
  name: 'Manage Expense',
  key: 'manage_expense',
  description: `Creates or updates an expense in Zoho Invoice.
If **expenseId** is provided, updates the existing expense. Otherwise, creates a new expense.
The **amount** field is required when creating a new expense.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      expenseId: z
        .string()
        .optional()
        .describe('ID of the expense to update. If omitted, a new expense is created.'),
      amount: z
        .number()
        .optional()
        .describe('Expense amount (required when creating a new expense)'),
      date: z.string().optional().describe('Expense date in YYYY-MM-DD format'),
      accountId: z.string().optional().describe('ID of the expense account'),
      customerId: z
        .string()
        .optional()
        .describe('ID of the customer to associate with this expense'),
      projectId: z
        .string()
        .optional()
        .describe('ID of the project to associate with this expense'),
      taxId: z.string().optional().describe('ID of the tax to apply to this expense'),
      isBillable: z
        .boolean()
        .optional()
        .describe('Whether the expense is billable to the customer'),
      referenceNumber: z.string().optional().describe('Reference number for the expense'),
      description: z.string().optional().describe('Description of the expense'),
      currencyCode: z
        .string()
        .optional()
        .describe('Currency code for the expense (e.g. USD, EUR)')
    })
  )
  .output(
    z.object({
      expenseId: z.string().describe('Unique ID of the expense'),
      date: z.string().describe('Expense date'),
      amount: z.number().describe('Expense amount'),
      total: z.number().describe('Total expense amount including tax'),
      taxAmount: z.number().describe('Tax amount applied to the expense'),
      isBillable: z.boolean().describe('Whether the expense is billable'),
      referenceNumber: z.string().describe('Reference number of the expense'),
      description: z.string().describe('Description of the expense'),
      customerId: z.string().describe('ID of the associated customer'),
      customerName: z.string().describe('Name of the associated customer'),
      status: z.string().describe('Status of the expense'),
      createdTime: z.string().describe('Timestamp when the expense was created'),
      lastModifiedTime: z.string().describe('Timestamp when the expense was last modified')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let data: Record<string, any> = {};

    if (ctx.input.amount !== undefined) data.amount = ctx.input.amount;
    if (ctx.input.date !== undefined) data.date = ctx.input.date;
    if (ctx.input.accountId !== undefined) data.account_id = ctx.input.accountId;
    if (ctx.input.customerId !== undefined) data.customer_id = ctx.input.customerId;
    if (ctx.input.projectId !== undefined) data.project_id = ctx.input.projectId;
    if (ctx.input.taxId !== undefined) data.tax_id = ctx.input.taxId;
    if (ctx.input.isBillable !== undefined) data.is_billable = ctx.input.isBillable;
    if (ctx.input.referenceNumber !== undefined)
      data.reference_number = ctx.input.referenceNumber;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.currencyCode !== undefined) data.currency_code = ctx.input.currencyCode;

    let expense: any;
    let action: string;

    if (ctx.input.expenseId) {
      expense = await client.updateExpense(ctx.input.expenseId, data);
      action = 'updated';
    } else {
      expense = await client.createExpense(data);
      action = 'created';
    }

    return {
      output: {
        expenseId: expense.expense_id ?? '',
        date: expense.date ?? '',
        amount: expense.amount ?? 0,
        total: expense.total ?? 0,
        taxAmount: expense.tax_amount ?? 0,
        isBillable: expense.is_billable ?? false,
        referenceNumber: expense.reference_number ?? '',
        description: expense.description ?? '',
        customerId: expense.customer_id ?? '',
        customerName: expense.customer_name ?? '',
        status: expense.status ?? '',
        createdTime: expense.created_time ?? '',
        lastModifiedTime: expense.last_modified_time ?? ''
      },
      message: `Successfully ${action} expense **${expense.expense_id}**.`
    };
  })
  .build();
