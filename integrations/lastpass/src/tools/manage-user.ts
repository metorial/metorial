import { SlateTool } from 'slates';
import { z } from 'zod';
import { email, invalid, LastPassClient } from '../lib/client';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Perform administrative actions on a LastPass user account. Reset the master password, disable multifactor authentication, or disable the user account.`,
  instructions: [
    'Use **resetPassword** to trigger a master password reset email for the user.',
    'Use **disableMultifactor** to remove multifactor authentication from the user.',
    'Use **disableAccount** to disable the user account (block logins).',
    'You can combine actions. They run in reset-password, disable-MFA, disable-account order and are not atomic. Earlier effects can remain after a later failure; no automatic rollback occurs.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      username: z.string().describe('Email address of the user'),
      resetPassword: z
        .boolean()
        .optional()
        .describe('Trigger a master password reset for this user'),
      disableMultifactor: z
        .boolean()
        .optional()
        .describe('Disable multifactor authentication for this user'),
      disableAccount: z
        .boolean()
        .optional()
        .describe('Disable the user account (block logins)')
    })
  )
  .output(
    z.object({
      completed: z
        .boolean()
        .describe('Whether all selected actions received native receipts without warnings'),
      failedAction: z
        .string()
        .optional()
        .describe(
          'Action that failed or reported warnings; subsequent actions were not attempted'
        ),
      outcomeUncertain: z
        .boolean()
        .optional()
        .describe(
          'The failed request may have applied; inspect account state before retrying'
        ),
      skippedActions: z
        .array(z.string())
        .optional()
        .describe('Selected actions not attempted after a failure or warning'),
      results: z
        .array(
          z.object({
            action: z.string().describe('Action performed'),
            status: z.string().describe('Native result status'),
            warnings: z
              .array(z.string())
              .optional()
              .describe('Native warnings indicating a partial result'),
            disabledUsers: z
              .array(z.string())
              .optional()
              .describe('Native disabled user receipt'),
            unchangedUsers: z
              .array(z.string())
              .optional()
              .describe('Native unchanged user receipt')
          })
        )
        .describe('Results of each action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LastPassClient({
      companyId: ctx.auth.companyId,
      provisioningHash: ctx.auth.provisioningHash
    });

    let username = email(ctx.input.username);
    let selected = [
      ...(ctx.input.resetPassword ? ['resetPassword' as const] : []),
      ...(ctx.input.disableMultifactor ? ['disableMultifactor' as const] : []),
      ...(ctx.input.disableAccount ? ['disableAccount' as const] : [])
    ];
    if (!selected.length)
      throw invalid(
        'Select at least one true action: resetPassword, disableMultifactor, or disableAccount.'
      );
    let results: Array<{
      action: string;
      status: string;
      warnings?: string[];
      disabledUsers?: string[];
      unchangedUsers?: string[];
    }> = [];
    for (let [index, action] of selected.entries()) {
      try {
        let result =
          action === 'resetPassword'
            ? await client.resetPassword(username)
            : action === 'disableMultifactor'
              ? await client.disableMultifactor(username)
              : await client.disableUser(username);
        results.push({ action, ...result });
        if (result.status === 'WARN')
          return {
            output: {
              results,
              completed: false,
              failedAction: action,
              outcomeUncertain: true,
              skippedActions: selected.slice(index + 1)
            },
            message:
              'LastPass returned warnings. Earlier actions remain applied; subsequent selected actions were not attempted. Verify current account state before retrying.'
          };
      } catch (error) {
        if (!results.length) throw error;
        return {
          output: {
            results,
            completed: false,
            failedAction: action,
            outcomeUncertain: true,
            skippedActions: selected.slice(index + 1)
          },
          message:
            'A later action failed after earlier native receipts. Earlier effects remain; subsequent selected actions were not attempted. Verify account state before retrying.'
        };
      }
    }
    return {
      output: { results, completed: true },
      message: `LastPass returned receipts for **${selected.join(', ')}** on **${username}**.`
    };
  })
  .build();
