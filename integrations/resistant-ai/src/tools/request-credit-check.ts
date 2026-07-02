import { SlateTool } from 'slates';
import { z } from 'zod';
import { IdentityCheckClient } from '../lib/client';
import { spec } from '../spec';

export let requestCreditCheck = SlateTool.create(spec, {
  name: 'Request Credit Check',
  key: 'request_credit_check',
  description: `Requests a credit check for an individual, which can include a full credit report, credit score, or credit risk alert depending on the check type selected. Results are returned asynchronously when the credit bureau completes processing.`,
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
      checkType: z
        .enum(['report', 'score', 'risk_alert'])
        .optional()
        .describe(
          'Type of credit check: "report" for full credit report, "score" for credit score only, "risk_alert" for credit risk alerts. Defaults to "report"'
        ),
      referenceId: z
        .string()
        .optional()
        .describe('Your own reference ID to correlate this check with your records')
    })
  )
  .output(
    z.object({
      checkId: z.string().describe('Unique ID of the credit check'),
      status: z.string().describe('Current status of the check'),
      checkType: z.string().describe('Type of credit check requested'),
      email: z.string().describe('Email address of the individual'),
      reportUrl: z.string().optional().describe('URL to the credit report when completed'),
      createdAt: z.string().optional().describe('Timestamp when the check was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IdentityCheckClient(ctx.auth.token);

    let result = await client.createCreditCheck({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      dateOfBirth: ctx.input.dateOfBirth,
      checkType: ctx.input.checkType,
      referenceId: ctx.input.referenceId
    });

    let checkType = ctx.input.checkType || 'report';

    return {
      output: {
        checkId: result.id || result.check_id,
        status: result.status || 'pending',
        checkType: result.check_type || checkType,
        email: result.email || ctx.input.email,
        reportUrl: result.report_url,
        createdAt: result.created_at
      },
      message: `Credit ${checkType} check initiated for **${ctx.input.firstName} ${ctx.input.lastName}** (${ctx.input.email}). Check ID: \`${result.id || result.check_id}\`.`
    };
  })
  .build();
