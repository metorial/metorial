import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let respondTimeOffRequest = SlateTool.create(spec, {
  name: 'Respond to Time Off Request',
  key: 'respond_time_off_request',
  description: `Approve or reject an employee's time off request in TalentHR. Requires the employee ID, the specific time off request ID, and whether to accept or reject it.`,
  constraints: ['Cannot respond to requests that have already been answered or cancelled.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('ID of the employee who submitted the time off request'),
      timeOffRequestId: z.string().describe('ID of the time off request to respond to'),
      accept: z.boolean().describe('Set to true to approve, false to reject the request')
    })
  )
  .output(
    z.object({
      timeOffRequestId: z.string().describe('ID of the time off request'),
      accepted: z.boolean().describe('Whether the request was approved or rejected'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.respondToTimeOffRequest(
      ctx.input.employeeId,
      ctx.input.timeOffRequestId,
      ctx.input.accept
    );

    let action = ctx.input.accept ? 'approved' : 'rejected';

    return {
      output: {
        timeOffRequestId: ctx.input.timeOffRequestId,
        accepted: ctx.input.accept,
        rawResponse: response
      },
      message: `Successfully **${action}** time off request ${ctx.input.timeOffRequestId} for employee ${ctx.input.employeeId}.`
    };
  })
  .build();
