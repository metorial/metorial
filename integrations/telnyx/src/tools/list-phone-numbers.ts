import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { spec } from '../spec';

export let listPhoneNumbers = SlateTool.create(spec, {
  name: 'List Phone Numbers',
  key: 'list_phone_numbers',
  description: `List phone numbers on your Telnyx account. Optionally filter by tag, status, or connection. Returns provisioned numbers with their configuration details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tag: z.string().optional().describe('Filter by tag'),
      status: z
        .string()
        .optional()
        .describe(
          'Filter by status (e.g., "active", "deleted", "port-in", "purchase-pending")'
        ),
      connectionId: z.string().optional().describe('Filter by connection ID'),
      pageNumber: z.number().optional().describe('Page number (1-based)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 20)')
    })
  )
  .output(
    z.object({
      phoneNumbers: z
        .array(
          z.object({
            phoneNumberId: z.string().describe('Unique ID of the phone number'),
            phoneNumber: z.string().describe('Phone number in E.164 format'),
            status: z.string().optional().describe('Current status of the number'),
            connectionId: z.string().optional().describe('Associated connection ID'),
            connectionName: z.string().optional().describe('Associated connection name'),
            tags: z.array(z.string()).optional().describe('Tags associated with the number'),
            createdAt: z.string().optional().describe('When the number was provisioned')
          })
        )
        .describe('List of phone numbers'),
      totalResults: z.number().optional().describe('Total number of phone numbers'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });

    let result = await client.listPhoneNumbers({
      tag: ctx.input.tag,
      status: ctx.input.status,
      connectionId: ctx.input.connectionId,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let phoneNumbers = (result.data ?? []).map((pn: any) => ({
      phoneNumberId: pn.id,
      phoneNumber: pn.phone_number,
      status: pn.status,
      connectionId: pn.connection_id,
      connectionName: pn.connection_name,
      tags: pn.tags,
      createdAt: pn.created_at
    }));

    return {
      output: {
        phoneNumbers,
        totalResults: result.meta?.total_results,
        totalPages: result.meta?.total_pages
      },
      message: `Found **${phoneNumbers.length}** phone number(s)${result.meta?.total_results ? ` (${result.meta.total_results} total)` : ''}.`
    };
  })
  .build();
