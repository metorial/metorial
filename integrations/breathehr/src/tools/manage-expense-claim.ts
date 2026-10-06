import { ServiceError } from '@lowerdeck/error';
import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  apiError,
  fail,
  pageParams,
  paginationSchema,
  readOne,
  readRows,
  requireId
} from '../lib/response';
import { spec } from '../spec';

export let manageExpenseClaim = SlateTool.create(spec, {
  name: 'Manage Expense Claim',
  key: 'manage_expense_claim',
  description: `List, read, create, decide or delete an expense claim in Breathe HR. Use **action "create"** to group expenses into a claim, or **"update"** to change the status of an existing claim.`,
  instructions: [
    'When creating, employeeId is required. Provide a nonempty list of expenseIds; creation submits a claim and can retain financial history.',
    'When updating, claimId, an approve decision (or legacy approved/rejected status) and approverRejectorId are required. Get reads the exact claim; delete requires the existing claim to be readable first.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The action to perform on the expense claim'),
      page: z.number().optional().describe('Page number for list'),
      perPage: z.number().optional().describe('Page size for list,1-100'),
      stateFilter: z
        .enum(['submitted', 'approved', 'completed', 'rejected'])
        .optional()
        .describe('Claim state for list'),
      approve: z
        .boolean()
        .optional()
        .describe('Explicit update decision: true approves,false rejects'),
      approverRejectorId: z
        .string()
        .optional()
        .describe(
          'Required acting employee ID for update; approval changes claim state and retains history'
        ),
      rejectionReason: z.string().optional().describe('Reason for rejecting a claim'),
      employeeId: z.string().optional().describe('Employee ID (required for create)'),
      expenseIds: z
        .array(z.string())
        .optional()
        .describe('List of expense IDs to include in the claim (for create)'),
      claimId: z.string().optional().describe('Expense claim ID (required for update)'),
      status: z
        .string()
        .optional()
        .describe('Legacy update decision: approved or rejected only; prefer approve')
    })
  )
  .output(
    z.object({
      expenseClaims: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Claim records for list'),
      pagination: paginationSchema.optional(),
      expenseClaim: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('The expense claim record'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });
    if (ctx.input.action === 'list') {
      const result = await client.list('employee_expense_claims', {
        ...pageParams(ctx.input),
        employee_id: ctx.input.employeeId,
        state_filter: ctx.input.stateFilter
      });
      return {
        output: {
          expenseClaims: readRows(result, 'employee_expense_claims'),
          pagination: result.pagination,
          success: true
        },
        message: 'Retrieved a claim page.'
      };
    }
    if (ctx.input.action === 'create') {
      const employeeId = requireId(ctx.input.employeeId, 'employeeId');
      if (!ctx.input.expenseIds?.length)
        fail('Provide a nonempty expenseIds list when creating a claim.');
      const expenseIds = ctx.input.expenseIds.map(value => requireId(value, 'expense ID'));
      if (new Set(expenseIds).size !== expenseIds.length)
        fail('expenseIds must not contain duplicates.');
      for (const expenseId of expenseIds) {
        const expense = readOne(
          await client.get('employee_expenses', expenseId),
          'employee_expenses',
          expenseId
        );
        if (
          requireId(expense.employee_id) !== employeeId ||
          expense.employee_expense_claim_id !== null
        )
          fail(
            'Every expense must belong to the requested employee and explicitly report no existing claim before creating a claim. Read the exact expense and check its claim state.'
          );
      }
      const expenseClaim = readOne(
        await client.create('employee_expense_claims', 'employee_expense_claims', {
          employee_id: employeeId,
          employee_expense_ids: expenseIds
        }),
        'employee_expense_claims'
      );
      if (requireId(expenseClaim.employee_id) !== employeeId)
        fail(
          'The claim receipt belongs to a different employee. Inspect the account before retrying.'
        );
      if (!Array.isArray(expenseClaim.employee_expenses))
        fail(
          'The claim receipt omitted its expenses. Inspect the account before retrying; a write may have completed.'
        );
      const returnedIds = expenseClaim.employee_expenses.map(value => {
        if (!isApiErrorRecord(value)) fail('The claim returned an invalid expense record.');
        return requireId(value.id, 'claimed expense ID');
      });
      if (
        returnedIds.length !== expenseIds.length ||
        new Set(returnedIds).size !== returnedIds.length ||
        returnedIds.some(value => !expenseIds.includes(value))
      )
        fail(
          'The exact claim expense set differs from the requested set. Inspect the account before retrying; a write may have completed.'
        );
      return {
        output: { expenseClaim, success: true },
        message: 'Created the expense claim. Financial history may be retained.'
      };
    }
    const claimId = requireId(ctx.input.claimId, 'claimId');
    if (ctx.input.action === 'get')
      return {
        output: {
          expenseClaim: readOne(
            await client.get('employee_expense_claims', claimId),
            'employee_expense_claims',
            claimId
          ),
          success: true
        },
        message: 'Retrieved the requested claim.'
      };
    if (ctx.input.action === 'update') {
      if (
        ctx.input.status !== undefined &&
        !['approved', 'rejected'].includes(ctx.input.status.toLowerCase())
      )
        fail(
          'The current update endpoint supports approval or rejection, not an arbitrary status. Use approve or legacy status approved/rejected.'
        );
      const legacyApprove =
        ctx.input.status === undefined
          ? undefined
          : ctx.input.status.toLowerCase() === 'approved';
      if (
        ctx.input.approve !== undefined &&
        legacyApprove !== undefined &&
        ctx.input.approve !== legacyApprove
      )
        fail('approve conflicts with the legacy status. Supply one consistent decision.');
      const approve = ctx.input.approve ?? legacyApprove;
      if (approve === undefined)
        fail('Set approve explicitly or use status approved/rejected.');
      const receipt = readOne(
        await client.updateClaim(claimId, {
          approve,
          approver_rejector_id: requireId(ctx.input.approverRejectorId, 'approverRejectorId'),
          rejection_reason: ctx.input.rejectionReason
        }),
        'employee_expense_claims',
        claimId
      );
      const expenseClaim = readOne(
        await client.get('employee_expense_claims', claimId),
        'employee_expense_claims',
        claimId
      );
      if (
        receipt.state !== expenseClaim.state ||
        expenseClaim.state !== (approve ? 'approved' : 'rejected')
      )
        fail(
          'The exact claim decision was not verified. Inspect financial history before retrying.'
        );
      return {
        output: { expenseClaim, success: true },
        message: 'Recorded and verified the exact claim decision.'
      };
    }
    readOne(
      await client.get('employee_expense_claims', claimId),
      'employee_expense_claims',
      claimId
    );
    await client.delete('employee_expense_claims', claimId);
    try {
      await client.get('employee_expense_claims', claimId);
    } catch (error) {
      if (error instanceof ServiceError && error.data.upstreamStatus === 404)
        return {
          output: { success: true },
          message: 'Deleted the claim and confirmed it is no longer readable.'
        };
      throw apiError(error, 'claim deletion readback');
    }
    return fail(
      'The claim remains readable after deletion. Inspect its state before retrying.'
    );
  })
  .build();
