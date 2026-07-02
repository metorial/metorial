import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let startWorkflow = SlateTool.create(spec, {
  name: 'Start Workflow',
  key: 'start_workflow',
  description: `Enrolls a subscriber into a marketing automation workflow by their email address. The workflow will begin executing its configured sequence of steps (emails, SMS, delays, conditions, actions) for the subscriber.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('ID of the workflow to start'),
      email: z.string().describe('Email address of the subscriber to enroll in the workflow')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the subscriber was successfully enrolled'),
      confirmationMessage: z.string().describe('Confirmation message from Sender')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.startWorkflow(ctx.input.workflowId, ctx.input.email);

    return {
      output: {
        success: result.success,
        confirmationMessage: result.message
      },
      message: `Subscriber **${ctx.input.email}** enrolled in workflow \`${ctx.input.workflowId}\`.`
    };
  })
  .build();
