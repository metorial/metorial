import { SlateTool } from 'slates';
import { z } from 'zod';
import { IdentityCheckClient } from '../lib/client';
import { spec } from '../spec';

export let requestBackgroundCheck = SlateTool.create(spec, {
  name: 'Request Background Check',
  key: 'request_background_check',
  description: `Initiates a US criminal background check for an individual. The check searches criminal records databases and returns results asynchronously. This is an additional check type available for individuals located in the United States.`,
  instructions: [
    'This check is only available for US-based individuals.',
    'Provide accurate name and date of birth for reliable matching.'
  ],
  constraints: ['Only available for United States criminal records.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the individual'),
      firstName: z.string().describe('First name of the individual'),
      lastName: z.string().describe('Last name of the individual'),
      dateOfBirth: z
        .string()
        .optional()
        .describe('Date of birth in ISO 8601 format (YYYY-MM-DD)'),
      referenceId: z
        .string()
        .optional()
        .describe('Your own reference ID to correlate this check with your records')
    })
  )
  .output(
    z.object({
      checkId: z.string().describe('Unique ID of the background check'),
      status: z.string().describe('Current status of the check (e.g., pending, completed)'),
      email: z.string().describe('Email address of the individual'),
      reportUrl: z
        .string()
        .optional()
        .describe('URL to the background check report when completed'),
      createdAt: z.string().optional().describe('Timestamp when the check was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IdentityCheckClient(ctx.auth.token);

    let result = await client.createBackgroundCheck({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      dateOfBirth: ctx.input.dateOfBirth,
      referenceId: ctx.input.referenceId
    });

    return {
      output: {
        checkId: result.id || result.check_id,
        status: result.status || 'pending',
        email: result.email || ctx.input.email,
        reportUrl: result.report_url,
        createdAt: result.created_at
      },
      message: `US background check initiated for **${ctx.input.firstName} ${ctx.input.lastName}** (${ctx.input.email}). Check ID: \`${result.id || result.check_id}\`.`
    };
  })
  .build();
