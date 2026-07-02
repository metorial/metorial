import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateLead = SlateTool.create(spec, {
  name: 'Update Lead',
  key: 'update_lead',
  description: `Update a lead's information including contact details, status, result, stage, and call blocking settings. Can also stop or block a lead from receiving calls.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.string().describe('ID of the lead to update'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      email: z.string().optional().describe('Updated email address'),
      phoneNumber: z.string().optional().describe('Updated phone number'),
      status: z.string().optional().describe('Updated lead status'),
      result: z.string().optional().describe('Updated lead result'),
      stage: z.string().optional().describe('Updated lead stage'),
      isStopped: z.boolean().optional().describe('Set to true to stop calls to this lead'),
      isBlocked: z.boolean().optional().describe('Set to true to block this lead')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('ID of the updated lead'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      status: z.string().optional().describe('Current status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let data: Record<string, any> = {};
    if (ctx.input.firstName !== undefined) data.fname = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) data.lname = ctx.input.lastName;
    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.phoneNumber !== undefined) data.phone_number = ctx.input.phoneNumber;
    if (ctx.input.status !== undefined) data.status = ctx.input.status;
    if (ctx.input.result !== undefined) data.result = ctx.input.result;
    if (ctx.input.stage !== undefined) data.stage = ctx.input.stage;
    if (ctx.input.isStopped !== undefined) data.is_stopped = ctx.input.isStopped;
    if (ctx.input.isBlocked !== undefined) data.is_blocked = ctx.input.isBlocked;

    let result = await client.updateLead(ctx.input.leadId, data);

    return {
      output: {
        leadId: String(result.id),
        firstName: result.fname,
        lastName: result.lname,
        status: result.status
      },
      message: `Lead **${result.fname ?? ''} ${result.lname ?? ''}** updated successfully.`
    };
  })
  .build();
