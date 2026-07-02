import { SlateTool } from 'slates';
import { z } from 'zod';
import { AmplitudeClient } from '../lib/client';
import { amplitudeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageCohortsTool = SlateTool.create(spec, {
  name: 'Manage Cohorts',
  key: 'manage_cohorts',
  description: `List, retrieve, create, or update behavioral cohorts in Amplitude. Cohorts are groups of users defined by shared behavior or characteristics. Use this to list all cohorts, get details of a specific cohort, or upload/update a cohort with specific user IDs.`,
  constraints: [
    'Maximum cohort size is 2 million users when uploading.',
    'Uploaded cohorts use static user lists, not dynamic behavioral definitions.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'upload', 'get_usage', 'update_membership'])
        .describe(
          'Action to perform: "list" cohorts, "get" one cohort, "get_usage" for download quota, "upload" a static cohort, or "update_membership" incrementally.'
        ),
      cohortId: z
        .string()
        .optional()
        .describe('Cohort ID for "get" and "update_membership" actions.'),
      upload: z
        .object({
          name: z.string().describe('Name for the cohort.'),
          appId: z.number().describe('Amplitude project/app ID.'),
          idType: z.enum(['BY_AMP_ID', 'BY_USER_ID']).describe('Type of IDs being uploaded.'),
          ids: z.array(z.string()).min(1).describe('Array of user IDs or Amplitude IDs.'),
          owner: z.string().optional().describe('Required email of the cohort owner.'),
          published: z
            .boolean()
            .optional()
            .describe('Required by Amplitude. Whether the cohort is discoverable.'),
          skipSave: z
            .boolean()
            .optional()
            .describe('Validate the upload without saving a cohort.'),
          skipInvalidIds: z
            .boolean()
            .optional()
            .describe('Skip invalid IDs and upload the remaining valid IDs.'),
          countGroup: z
            .string()
            .optional()
            .describe('Optional group name for group cohorts, sent as cg.'),
          existingCohortId: z
            .string()
            .optional()
            .describe('ID of existing cohort to update instead of creating new.')
        })
        .optional()
        .describe('Upload parameters. Required for "upload" action.'),
      membership: z
        .object({
          memberships: z
            .array(
              z.object({
                ids: z.array(z.string()).min(1).describe('IDs to add or remove.'),
                idType: z
                  .enum(['BY_ID', 'BY_NAME'])
                  .describe('BY_ID is Amplitude ID/group ID; BY_NAME is user ID/group name.'),
                operation: z.enum(['ADD', 'REMOVE']).describe('Membership operation.')
              })
            )
            .min(1)
            .describe('Membership operations to apply.'),
          countGroup: z
            .string()
            .optional()
            .describe('Count group for the given IDs. Defaults to User in Amplitude.'),
          skipInvalidIds: z
            .boolean()
            .optional()
            .describe('Skip invalid IDs instead of rejecting the full update.')
        })
        .optional()
        .describe('Membership update parameters. Required for "update_membership" action.')
    })
  )
  .output(
    z.object({
      cohorts: z
        .array(
          z.object({
            cohortId: z.string().optional(),
            name: z.string().optional(),
            description: z.string().optional(),
            size: z.number().optional(),
            lastComputed: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional()
        .describe('List of cohorts (for "list" action).'),
      cohort: z.any().optional().describe('Cohort details (for "get" action).'),
      usage: z.any().optional().describe('Cohort download quota usage.'),
      uploadResult: z.any().optional().describe('Upload result (for "upload" action).'),
      membershipResult: z
        .any()
        .optional()
        .describe('Membership update result (for "update_membership" action).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AmplitudeClient({
      apiKey: ctx.auth.apiKey,
      secretKey: ctx.auth.secretKey,
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.action === 'list') {
      let result = await client.listCohorts();
      let cohorts = (result.cohorts ?? result ?? []).map((c: any) => ({
        cohortId: c.id ?? c.cohort_id,
        name: c.name,
        description: c.description,
        size: c.size,
        lastComputed: c.last_computed,
        createdAt: c.created_at
      }));

      return {
        output: { cohorts },
        message: `Found **${cohorts.length}** cohort(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.cohortId) {
        throw amplitudeServiceError('cohortId is required for "get" action.');
      }
      let result = await client.getCohort(ctx.input.cohortId);
      return {
        output: { cohort: result },
        message: `Retrieved cohort **${ctx.input.cohortId}**.`
      };
    }

    if (ctx.input.action === 'get_usage') {
      let result = await client.getCohortUsage();
      return {
        output: { usage: result },
        message: 'Retrieved Behavioral Cohorts Download API usage.'
      };
    }

    if (ctx.input.action === 'upload') {
      if (!ctx.input.upload) {
        throw amplitudeServiceError('upload parameters are required for "upload" action.');
      }
      if (!ctx.input.upload.owner) {
        throw amplitudeServiceError('upload.owner is required by Amplitude.');
      }
      if (ctx.input.upload.published === undefined) {
        throw amplitudeServiceError('upload.published is required by Amplitude.');
      }
      let result = await client.uploadCohort(ctx.input.upload);
      return {
        output: { uploadResult: result },
        message: `${ctx.input.upload.skipSave ? 'Validated' : ctx.input.upload.existingCohortId ? 'Updated' : 'Created'} cohort "${ctx.input.upload.name}" with **${ctx.input.upload.ids.length}** users.`
      };
    }

    if (ctx.input.action === 'update_membership') {
      if (!ctx.input.cohortId) {
        throw amplitudeServiceError('cohortId is required for "update_membership" action.');
      }
      if (!ctx.input.membership) {
        throw amplitudeServiceError(
          'membership parameters are required for "update_membership" action.'
        );
      }
      let result = await client.updateCohortMembership({
        cohortId: ctx.input.cohortId,
        memberships: ctx.input.membership.memberships,
        countGroup: ctx.input.membership.countGroup,
        skipInvalidIds: ctx.input.membership.skipInvalidIds
      });
      return {
        output: { membershipResult: result },
        message: `Updated membership for cohort **${ctx.input.cohortId}**.`
      };
    }

    throw amplitudeServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
