import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPhoneNumbers = SlateTool.create(spec, {
  name: 'List Phone Numbers',
  key: 'list_phone_numbers',
  description: `List provisioned phone numbers in your workspace. Returns number details including SID and capabilities. Use these numbers when assigning agents for inbound/outbound calling.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspace: z.string().describe('Workspace ID from the Synthflow dashboard'),
      limit: z.number().optional().describe('Numbers per page (default: 20)'),
      offset: z.number().optional().describe('Starting index for pagination')
    })
  )
  .output(
    z.object({
      phoneNumbers: z
        .array(
          z.object({
            number: z.string().optional(),
            sid: z.string().nullable().optional()
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
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listPhoneNumbers({
      workspace: ctx.input.workspace,
      limit: ctx.input.limit,
      offset: ctx.input.offset
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
