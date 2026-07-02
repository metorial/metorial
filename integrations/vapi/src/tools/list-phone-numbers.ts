import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPhoneNumbers = SlateTool.create(spec, {
  name: 'List Phone Numbers',
  key: 'list_phone_numbers',
  description: `List phone numbers provisioned in your Vapi account. Returns phone numbers across all providers (Vapi, Twilio, Vonage, Telnyx, BYO) with their routing configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of phone numbers to return (default 100)'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter for numbers created after this ISO 8601 timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter for numbers created before this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      phoneNumbers: z
        .array(
          z.object({
            phoneNumberId: z.string().describe('ID of the phone number'),
            provider: z.string().optional().describe('Phone number provider'),
            number: z.string().optional().describe('Phone number in E.164 format'),
            name: z.string().optional().describe('Name of the phone number'),
            status: z.string().optional().describe('Status (active, activating, blocked)'),
            assistantId: z.string().optional().describe('Assigned assistant ID'),
            squadId: z.string().optional().describe('Assigned squad ID'),
            workflowId: z.string().optional().describe('Assigned workflow ID'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of phone numbers'),
      count: z.number().describe('Number of phone numbers returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.createdAfter) params.createdAtGt = ctx.input.createdAfter;
    if (ctx.input.createdBefore) params.createdAtLt = ctx.input.createdBefore;

    let phoneNumbers = await client.listPhoneNumbers(params);

    return {
      output: {
        phoneNumbers: phoneNumbers.map((pn: any) => ({
          phoneNumberId: pn.id,
          provider: pn.provider,
          number: pn.number,
          name: pn.name,
          status: pn.status,
          assistantId: pn.assistantId,
          squadId: pn.squadId,
          workflowId: pn.workflowId,
          createdAt: pn.createdAt
        })),
        count: phoneNumbers.length
      },
      message: `Found **${phoneNumbers.length}** phone number(s).`
    };
  })
  .build();
