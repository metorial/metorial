import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { workspaceSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listPhoneNumbers = SlateTool.create(spec, {
  name: 'List Phone Numbers',
  key: 'list_phone_numbers',
  description: `List provisioned phone numbers in your workspace. Returns number details including SID and inbound availability. Use these numbers when assigning agents for inbound/outbound calling. Discover workspace_id with manage_contact (get/list) or run_simulation (list).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspace: workspaceSchema,
      limit: z.number().int().positive().optional().describe('Numbers per page (default: 20)'),
      offset: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Starting index for pagination'),
      isAvailable: z
        .boolean()
        .optional()
        .describe('Filter numbers by availability for inbound assignment')
    })
  )
  .output(
    z.object({
      phoneNumbers: z
        .array(
          z.object({
            number: z.string().optional(),
            sid: z.string().nullable().optional(),
            is_available: z.boolean().optional()
          })
        )
        .describe('List of phone numbers'),
      pagination: z
        .object({
          totalRecords: z.number().optional(),
          limit: z.number().optional(),
          offset: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.listPhoneNumbers({
      workspace: ctx.input.workspace,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      is_available: ctx.input.isAvailable
    });
    let response = result.response || {};
    let phoneNumbers = response.phone_numbers || [];
    let pagination = response.pagination;

    return {
      output: {
        phoneNumbers,
        pagination: pagination
          ? {
              totalRecords: pagination.total_records,
              limit: pagination.limit,
              offset: pagination.offset
            }
          : undefined
      },
      message: `Found ${phoneNumbers.length} phone number(s).`
    };
  })
  .build();
