import { SlateTool } from 'slates';
import { z } from 'zod';
import { AmplitudeClient } from '../lib/client';
import { spec } from '../spec';

export let deleteUserDataTool = SlateTool.create(spec, {
  name: 'Delete User Data',
  key: 'delete_user_data',
  description: `Request deletion of user data from Amplitude for privacy compliance (GDPR/CCPA). Supports deleting a single user or multiple users in bulk. You can also check the status of pending deletion jobs.`,
  instructions: [
    'Deletion requests are processed asynchronously and may take time to complete.',
    'Use the "check_status" action to monitor the progress of deletion jobs.'
  ],
  constraints: [
    'Deletion is irreversible once processed.',
    'Maximum of 100 user IDs per bulk deletion request.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['delete', 'bulk_delete', 'check_status'])
        .describe(
          '"delete" a single user, "bulk_delete" multiple users, or "check_status" of deletion jobs.'
        ),
      userId: z.string().optional().describe('User ID to delete. For "delete" action.'),
      amplitudeId: z
        .number()
        .optional()
        .describe('Amplitude ID to delete. For "delete" action.'),
      requester: z
        .string()
        .optional()
        .describe('Email of the person requesting deletion (for audit trail).'),
      bulkDelete: z
        .object({
          userIds: z.array(z.string()).optional().describe('Array of user IDs to delete.'),
          amplitudeIds: z
            .array(z.number())
            .optional()
            .describe('Array of Amplitude IDs to delete.'),
          deleteFromOrg: z
            .boolean()
            .optional()
            .describe('Delete across all projects in the organization.'),
          ignoreInvalidId: z
            .boolean()
            .optional()
            .describe('Continue processing even if some IDs are invalid.')
        })
        .optional()
        .describe('Parameters for "bulk_delete" action.'),
      statusFilter: z
        .object({
          startDay: z.string().optional().describe('Filter jobs from this date (YYYY-MM-DD).'),
          endDay: z.string().optional().describe('Filter jobs until this date (YYYY-MM-DD).')
        })
        .optional()
        .describe('Filter parameters for "check_status" action.')
    })
  )
  .output(
    z.object({
      deletionResult: z.any().optional().describe('Result of the deletion request.'),
      jobs: z.array(z.any()).optional().describe('List of deletion jobs (for "check_status").')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AmplitudeClient({
      apiKey: ctx.auth.apiKey,
      secretKey: ctx.auth.secretKey,
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.action === 'delete') {
      let result = await client.requestUserDeletion({
        userId: ctx.input.userId,
        amplitudeId: ctx.input.amplitudeId,
        requester: ctx.input.requester
      });
      return {
        output: { deletionResult: result },
        message: `Deletion requested for user **${ctx.input.userId ?? ctx.input.amplitudeId}**.`
      };
    }

    if (ctx.input.action === 'bulk_delete') {
      if (!ctx.input.bulkDelete) throw new Error('bulkDelete parameters are required.');
      let result = await client.requestBulkUserDeletion({
        userIds: ctx.input.bulkDelete.userIds,
        amplitudeIds: ctx.input.bulkDelete.amplitudeIds,
        requester: ctx.input.requester,
        deleteFromOrg: ctx.input.bulkDelete.deleteFromOrg,
        ignoreInvalidId: ctx.input.bulkDelete.ignoreInvalidId
      });
      let count =
        (ctx.input.bulkDelete.userIds?.length ?? 0) +
        (ctx.input.bulkDelete.amplitudeIds?.length ?? 0);
      return {
        output: { deletionResult: result },
        message: `Bulk deletion requested for **${count}** user(s).`
      };
    }

    if (ctx.input.action === 'check_status') {
      let result = await client.getDeletionJobs(ctx.input.statusFilter);
      return {
        output: { jobs: result.data ?? result },
        message: `Retrieved deletion job status.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
