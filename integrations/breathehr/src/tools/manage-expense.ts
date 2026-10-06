import { ServiceError } from '@lowerdeck/error';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  apiError,
  decimal,
  equalDecimal,
  fail,
  pageParams,
  paginationSchema,
  readOne,
  readRows,
  requireDate,
  requireId,
  requireText
} from '../lib/response';
import { spec } from '../spec';

export let manageExpense = SlateTool.create(spec, {
  name: 'Manage Expense',
  key: 'manage_expense',
  description: `List, create, retrieve, or delete employee expenses in Breathe HR. Use **action "create"** to add a new expense, **"get"** to retrieve an existing expense, or **"delete"** to remove one.`,
  instructions: [
    'When creating, employeeId, expenseDate, description, amount, companyExpenseTypeId and explicit payableToEmployee are required. A returned expense can affect claims and retained financial history.',
    'When getting or deleting, only expenseId is required.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'get', 'delete']).describe('The action to perform'),
      page: z.number().optional().describe('Page number for list'),
      perPage: z.number().optional().describe('Page size for list,1-100'),
      showClaimed: z.boolean().optional().describe('Include claimed expenses when listing'),
      companyExpenseTypeId: z
        .string()
        .optional()
        .describe(
          'Required expense type ID for create; obtain it from an authorized account administrator'
        ),
      expenseId: z.string().optional().describe('Expense ID (required for get and delete)'),
      employeeId: z.string().optional().describe('Employee ID (required for create)'),
      expenseDate: z
        .string()
        .optional()
        .describe('Expense date (format: YYYY-MM-DD or YYYY/MM/DD, required for create)'),
      description: z
        .string()
        .optional()
        .describe('Description of the expense (required for create)'),
      amount: z
        .string()
        .optional()
        .describe('Expense amount as a string (required for create)'),
      payableToEmployee: z
        .boolean()
        .optional()
        .describe('Whether the expense is reimbursable to the employee'),
      chargeable: z
        .boolean()
        .optional()
        .describe('Whether the expense is chargeable to a client')
    })
  )
  .output(
    z.object({
      expenses: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Expense records for list'),
      pagination: paginationSchema.optional(),
      expense: z.record(z.string(), z.unknown()).optional().describe('The expense record'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });
    if (ctx.input.action === 'list') {
      const result = await client.list('employee_expenses', {
        ...pageParams(ctx.input),
        employee_id: ctx.input.employeeId,
        show_claimed: ctx.input.showClaimed
      });
      return {
        output: {
          expenses: readRows(result, 'employee_expenses'),
          pagination: result.pagination,
          success: true
        },
        message: 'Retrieved an expense page.'
      };
    }
    if (ctx.input.action === 'create') {
      if (ctx.input.payableToEmployee === undefined)
        fail('Set payableToEmployee explicitly before creating an expense.');
      const employeeId = requireId(ctx.input.employeeId, 'employeeId');
      const expenseDate = requireDate(ctx.input.expenseDate, 'expenseDate');
      const expenseTypeId = requireId(ctx.input.companyExpenseTypeId, 'companyExpenseTypeId');
      const expense = readOne(
        await client.create('employee_expenses', 'employee_expenses', {
          employee_id: employeeId,
          expense_date: expenseDate,
          description: requireText(ctx.input.description, 'description'),
          amount: decimal(ctx.input.amount, 'amount'),
          company_expense_type_id: expenseTypeId,
          payable_to_employee: ctx.input.payableToEmployee,
          chargeable_to_client: ctx.input.chargeable
        }),
        'employee_expenses'
      );
      if (requireId(expense.employee_id) !== employeeId)
        fail(
          'The expense receipt belongs to a different employee. Inspect the account before retrying.'
        );
      const returnedExpenseType = expense.company_expense_type_id;
      if (
        !equalDecimal(expense.amount, decimal(ctx.input.amount, 'amount')) ||
        expense.expense_date !== expenseDate ||
        (typeof returnedExpenseType !== 'string' && typeof returnedExpenseType !== 'number') ||
        String(returnedExpenseType) !== expenseTypeId ||
        expense.description !== ctx.input.description ||
        expense.payable_to_employee !== ctx.input.payableToEmployee ||
        (ctx.input.chargeable !== undefined &&
          expense.chargeable_to_client !== ctx.input.chargeable)
      )
        fail(
          'The exact expense amount or requested fields differ from the creation receipt. Inspect the account before retrying; a write may have completed.'
        );
      return { output: { expense, success: true }, message: 'Created the expense record.' };
    }
    const expenseId = requireId(ctx.input.expenseId, 'expenseId');
    if (ctx.input.action === 'get')
      return {
        output: {
          expense: readOne(
            await client.get('employee_expenses', expenseId),
            'employee_expenses',
            expenseId
          ),
          success: true
        },
        message: 'Retrieved the requested expense.'
      };
    readOne(await client.get('employee_expenses', expenseId), 'employee_expenses', expenseId);
    await client.delete('employee_expenses', expenseId);
    try {
      await client.get('employee_expenses', expenseId);
    } catch (error) {
      if (error instanceof ServiceError && error.data.upstreamStatus === 404)
        return {
          output: { success: true },
          message: 'Deleted the expense and confirmed it is no longer readable.'
        };
      throw apiError(error, 'expense deletion readback');
    }
    return fail(
      'The expense remains readable after deletion. Inspect its state before retrying.'
    );
  })
  .build();
