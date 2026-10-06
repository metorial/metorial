import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { spec } from '../spec';
export const rejectApplicationTool = SlateTool.create(spec, {
  key: 'reject_application',
  name: 'Reject Application',
  description:
    'Reject an application with a required rejection reason. Email scheduling requires a template and timestamp. This operation retains rejection history and may send email; confirmation does not prove email delivery.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      emailFromUserId: z
        .string()
        .optional()
        .describe('Optional Greenhouse sender user ID when requesting an email.'),
      applicationId: z.string().describe('The application ID to reject'),
      rejectionReasonId: z
        .string()
        .optional()
        .describe('Required by Harvest v3. Obtain the ID with list_rejection_reasons.'),
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
      applicationId: z.string(),
      rejectionReasonId: z.string(),
      emailRequested: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    return {
      output: await new GreenhouseClient(ctx.auth, ctx.config).rejectApplication(
        ctx.input.applicationId,
        ctx.input
      ),
      message:
        'Confirmed the application rejection. A requested email was submitted for scheduling; delivery is not verified.'
    };
  })
  .build();
