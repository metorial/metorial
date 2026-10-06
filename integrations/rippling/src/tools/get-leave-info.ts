import { SlateTool } from 'slates';
import { z } from 'zod';
import { RipplingClient } from '../lib/client';
import { spec } from '../spec';

export let listLeaveTypes = SlateTool.create(spec, {
  name: 'List Leave Types',
  key: 'list_leave_types',
  description: `Retrieve the company's configured leave types. Can optionally filter by the system that manages each leave type.`,
  instructions: [
    'Use managedBy filter: "PTO" for Rippling Time Off, "LEAVES" for Rippling Leave Management, "TILT" for third-party Tilt.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      managedBy: z
        .string()
        .optional()
        .describe('Filter by managing system (PTO, LEAVES, TILT)')
    })
  )
  .output(
    z.object({
      leaveTypes: z
        .array(
          z.object({
            leaveTypeId: z.string().describe('Unique leave type identifier'),
            key: z.string().optional().describe('Leave type key'),
            name: z.string().optional().describe('Leave type name'),
            description: z.string().optional().describe('Leave type description'),
            isUnpaid: z.boolean().optional().describe('Whether this leave type is unpaid')
          })
        )
        .describe('List of company leave types'),
      count: z.number().describe('Number of leave types returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RipplingClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });
    let leaveTypes = await client.listLeaveTypes({
      managedBy: ctx.input.managedBy
    });

    const items = leaveTypes.map(lt => ({
      leaveTypeId: lt.id,
      key: lt.leaveType ?? lt.key,
      name: lt.name,
      description: lt.description,
      isUnpaid: lt.isUnpaid
    }));

    return {
      output: {
        leaveTypes: items,
        count: items.length
      },
      message: `Retrieved **${items.length}** leave type(s).`
    };
  })
  .build();

export let getLeaveBalances = SlateTool.create(spec, {
  name: 'Get Leave Balances',
  key: 'get_leave_balances',
  description: `Retrieve leave balances for a specific employee. Returns the remaining balance for each leave type, including whether the balance is unlimited.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      roleId: z
        .string()
        .describe('The role ID (employee identifier) to get leave balances for')
    })
  )
  .output(
    z.object({
      roleId: z.string().describe('Employee role ID'),
      balances: z
        .array(
          z.object({
            companyLeaveTypeId: z
              .string()
              .optional()
              .describe('Company leave type identifier'),
            isUnlimited: z.boolean().optional().describe('Whether the balance is unlimited'),
            remainingBalanceMinutes: z
              .number()
              .optional()
              .describe('Remaining balance in minutes'),
            remainingBalanceMinutesWithFuture: z
              .number()
              .optional()
              .describe('Remaining balance in minutes including future leave requests')
          })
        )
        .describe('Leave balances per leave type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RipplingClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });
    let data = await client.getLeaveBalances(ctx.input.roleId);

    const balances = data.balances.map(b => ({
      companyLeaveTypeId: b.companyLeaveType,
      isUnlimited: b.isBalanceUnlimited,
      remainingBalanceMinutes: b.balanceWithoutFutureRequests,
      remainingBalanceMinutesWithFuture: b.balanceWithFutureRequests
    }));

    return {
      output: {
        roleId: ctx.input.roleId,
        balances
      },
      message: `Retrieved **${balances.length}** leave balance(s) for employee **${ctx.input.roleId}**.`
    };
  })
  .build();
