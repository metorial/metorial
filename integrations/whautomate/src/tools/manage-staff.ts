import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageStaff = SlateTool.create(spec, {
  name: 'Manage Staff',
  key: 'manage_staff',
  description: `List staff members, get staff details, and manage staff availability blocks. Availability blocks mark periods when staff are unavailable (leaves, personal commitments). You can view, create, and delete availability blocks.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'get_availability', 'create_block', 'delete_block'])
        .describe('Action to perform'),
      staffId: z
        .string()
        .optional()
        .describe(
          'Staff member ID (required for get, get_availability, create_block, delete_block)'
        ),
      blockId: z
        .string()
        .optional()
        .describe('Availability block ID (required for delete_block)'),
      fromDate: z
        .string()
        .optional()
        .describe('Start date for availability blocks (YYYY-MM-DD, for get_availability)'),
      toDate: z
        .string()
        .optional()
        .describe('End date for availability blocks (YYYY-MM-DD, for get_availability)'),
      blockStartDate: z
        .string()
        .optional()
        .describe('Block start datetime (for create_block)'),
      blockEndDate: z.string().optional().describe('Block end datetime (for create_block)'),
      blockReason: z.string().optional().describe('Reason for the block (for create_block)'),
      page: z.number().optional().describe('Page number (for list)'),
      pageSize: z.number().optional().describe('Results per page (for list)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      staff: z.record(z.string(), z.any()).optional().describe('Staff member record'),
      staffMembers: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of staff members'),
      availabilityBlocks: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Staff availability blocks'),
      block: z.record(z.string(), z.any()).optional().describe('Created availability block')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listStaff({
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
      let staffMembers = Array.isArray(result) ? result : result.staffs || result.data || [];
      return {
        output: { success: true, staffMembers },
        message: `Found **${staffMembers.length}** staff member(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.staffId) throw new Error('staffId is required for get');
      let result = await client.getStaff(ctx.input.staffId);
      return {
        output: { success: true, staff: result },
        message: `Retrieved staff member **${result.name || ctx.input.staffId}**.`
      };
    }

    if (action === 'get_availability') {
      if (!ctx.input.staffId) throw new Error('staffId is required for get_availability');
      let result = await client.getStaffAvailabilityBlocks(ctx.input.staffId, {
        fromDate: ctx.input.fromDate,
        toDate: ctx.input.toDate
      });
      let blocks = Array.isArray(result)
        ? result
        : result.availabilityBlocks || result.data || [];
      return {
        output: { success: true, availabilityBlocks: blocks },
        message: `Found **${blocks.length}** availability block(s) for staff ${ctx.input.staffId}.`
      };
    }

    if (action === 'create_block') {
      if (!ctx.input.staffId) throw new Error('staffId is required for create_block');
      let data: Record<string, any> = {};
      if (ctx.input.blockStartDate) data.startDate = ctx.input.blockStartDate;
      if (ctx.input.blockEndDate) data.endDate = ctx.input.blockEndDate;
      if (ctx.input.blockReason) data.reason = ctx.input.blockReason;

      let result = await client.createStaffAvailabilityBlock(ctx.input.staffId, data);
      return {
        output: { success: true, block: result },
        message: `Created availability block for staff ${ctx.input.staffId}.`
      };
    }

    if (action === 'delete_block') {
      if (!ctx.input.staffId) throw new Error('staffId is required for delete_block');
      if (!ctx.input.blockId) throw new Error('blockId is required for delete_block');
      await client.deleteStaffAvailabilityBlock(ctx.input.staffId, ctx.input.blockId);
      return {
        output: { success: true },
        message: `Deleted availability block ${ctx.input.blockId} for staff ${ctx.input.staffId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
