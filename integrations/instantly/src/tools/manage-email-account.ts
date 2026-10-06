import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, invalid } from '../lib/client';
import { spec } from '../spec';

export let manageEmailAccount = SlateTool.create(spec, {
  name: 'Manage Email Account',
  key: 'manage_email_account',
  description: `Pause, resume, update settings, or delete a connected email sending account. Supports updating daily limits and sending gaps. Resuming can send real emails; deletion removes the connected account.`,
  instructions: [
    'Use action "pause" to stop sending from this account, "resume" to re-enable sending, "delete" to remove the account.',
    'Settings updates (dailyLimit, sendingGap) are applied before the action.'
  ]
})
  .input(
    z.object({
      accountEmail: z.string().describe('Email address of the account to manage.'),
      action: z
        .enum(['pause', 'resume', 'delete', 'update'])
        .optional()
        .describe('Action to perform on the account.'),
      dailyLimit: z.number().optional().describe('Updated daily sending limit.'),
      sendingGap: z.number().optional().describe('Updated gap between sends in seconds.')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Account email address'),
      status: z.number().optional().describe('Account status after action'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { accountEmail, action } = ctx.input;
    if (
      ctx.input.dailyLimit === undefined &&
      ctx.input.sendingGap === undefined &&
      (!action || action === 'update')
    ) {
      throw invalid('Provide settings to update or a pause, resume, or delete action.');
    }
    if (ctx.input.sendingGap !== undefined && ctx.input.sendingGap < 0)
      throw invalid('sendingGap must not be negative.');

    let updatePayload: Record<string, any> = {};
    if (ctx.input.dailyLimit !== undefined) updatePayload.daily_limit = ctx.input.dailyLimit;
    if (ctx.input.sendingGap !== undefined)
      updatePayload.sending_gap = ctx.input.sendingGap / 60;

    let result =
      Object.keys(updatePayload).length > 0
        ? await client.updateAccount(accountEmail, updatePayload)
        : undefined;

    if (action === 'pause') {
      result = await client.pauseAccount(accountEmail);
    } else if (action === 'resume') {
      result = await client.resumeAccount(accountEmail);
    } else if (action === 'delete') {
      await client.deleteAccount(accountEmail);
      return {
        output: { email: accountEmail, success: true },
        message: `Deleted email account **${accountEmail}**.`
      };
    }

    if (!result) throw invalid('No account update was submitted.');
    return {
      output: {
        email: result?.email ?? accountEmail,
        status: result?.status,
        success: true
      },
      message: `${action === 'pause' ? 'Paused' : action === 'resume' ? 'Resumed' : 'Updated'} email account **${accountEmail}**.`
    };
  })
  .build();
