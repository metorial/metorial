import { SlateTool } from 'slates';
import { z } from 'zod';
import { IdentityCheckClient } from '../lib/client';
import { spec } from '../spec';

export let manageVerification = SlateTool.create(spec, {
  name: 'Manage Verification',
  key: 'manage_verification',
  description: `Perform management actions on an existing identity verification request. Supports cancelling a pending verification or resending the verification email to the individual. Use "cancel" to stop a verification that is no longer needed, or "resend" to remind the individual to complete their check.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      verificationId: z.string().describe('ID of the verification to manage'),
      action: z
        .enum(['cancel', 'resend'])
        .describe(
          'Action to perform: "cancel" to cancel the verification, "resend" to resend the verification email'
        )
    })
  )
  .output(
    z.object({
      verificationId: z.string().describe('ID of the verification'),
      status: z.string().describe('Updated status of the verification'),
      actionPerformed: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IdentityCheckClient(ctx.auth.token);
    let result: Record<string, any>;

    if (ctx.input.action === 'cancel') {
      result = await client.cancelVerification(ctx.input.verificationId);
    } else {
      result = await client.resendVerificationEmail(ctx.input.verificationId);
    }

    let status = result.status || (ctx.input.action === 'cancel' ? 'cancelled' : 'pending');

    return {
      output: {
        verificationId: result.id || result.verification_id || ctx.input.verificationId,
        status,
        actionPerformed: ctx.input.action
      },
      message:
        ctx.input.action === 'cancel'
          ? `Verification \`${ctx.input.verificationId}\` has been **cancelled**.`
          : `Verification email for \`${ctx.input.verificationId}\` has been **resent**.`
    };
  })
  .build();
