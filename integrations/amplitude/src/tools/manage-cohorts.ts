import { SlateTool } from 'slates';
import { z } from 'zod';
import { AmplitudeClient } from '../lib/client';
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
        .enum(['list', 'get', 'upload'])
        .describe(
          'Action to perform: "list" all cohorts, "get" a specific cohort, or "upload" a new/updated cohort.'
        ),
      cohortId: z.string().optional().describe('Cohort ID for "get" action.'),
      upload: z
        .object({
          name: z.string().describe('Name for the cohort.'),
          appId: z.number().describe('Amplitude project/app ID.'),
          idType: z.enum(['BY_AMP_ID', 'BY_USER_ID']).describe('Type of IDs being uploaded.'),
          ids: z.array(z.string()).describe('Array of user IDs or Amplitude IDs.'),
          owner: z.string().optional().describe('Email of the cohort owner.'),
          existingCohortId: z
            .string()
            .optional()
            .describe('ID of existing cohort to update instead of creating new.')
        })
        .optional()
        .describe('Upload parameters. Required for "upload" action.')
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
      uploadResult: z.any().optional().describe('Upload result (for "upload" action).')
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
      if (!ctx.input.cohortId) throw new Error('cohortId is required for "get" action.');
      let result = await client.getCohort(ctx.input.cohortId);
      return {
        output: { cohort: result },
        message: `Retrieved cohort **${ctx.input.cohortId}**.`
      };
    }

    if (ctx.input.action === 'upload') {
      if (!ctx.input.upload)
        throw new Error('upload parameters are required for "upload" action.');
      let result = await client.uploadCohort(ctx.input.upload);
      return {
        output: { uploadResult: result },
        message: `${ctx.input.upload.existingCohortId ? 'Updated' : 'Created'} cohort "${ctx.input.upload.name}" with **${ctx.input.upload.ids.length}** users.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
