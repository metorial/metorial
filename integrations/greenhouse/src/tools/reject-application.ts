import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { spec } from '../spec';

export let rejectApplicationTool = SlateTool.create(spec, {
  name: 'Reject Application',
  key: 'reject_application',
  description: `Reject a candidate's application. Optionally specify a rejection reason, notes, and whether to send a rejection email. Requires the **On-Behalf-Of** user ID in config.`,
  constraints: ['Requires the onBehalfOf config value to be set for audit purposes.'],
  tags: { readOnly: false }
})
  .input(
    z.object({
      applicationId: z.string().describe('The application ID to reject'),
      rejectionReasonId: z.string().optional().describe('ID of the rejection reason'),
      notes: z.string().optional().describe('Notes about the rejection'),
      sendRejectionEmail: z.boolean().optional().describe('Whether to send a rejection email'),
      emailTemplateId: z
        .string()
        .optional()
        .describe('Email template ID for the rejection email'),
      sendEmailAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp for when to send the rejection email')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      applicationId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });

    let rejectionEmail = ctx.input.sendRejectionEmail
      ? {
          sendEmailAt: ctx.input.sendEmailAt,
          emailTemplateId: ctx.input.emailTemplateId
            ? Number.parseInt(ctx.input.emailTemplateId, 10)
            : undefined
        }
      : undefined;

    await client.rejectApplication(Number.parseInt(ctx.input.applicationId, 10), {
      rejectionReasonId: ctx.input.rejectionReasonId
        ? Number.parseInt(ctx.input.rejectionReasonId, 10)
        : undefined,
      notes: ctx.input.notes,
      rejectionEmail
    });

    return {
      output: {
        success: true,
        applicationId: ctx.input.applicationId
      },
      message: `Application **${ctx.input.applicationId}** has been rejected.${ctx.input.sendRejectionEmail ? ' A rejection email will be sent.' : ''}`
    };
  })
  .build();
