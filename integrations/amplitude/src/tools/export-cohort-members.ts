import { createHash } from 'node:crypto';
import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { createAnalyticsClient } from '../lib/analytics-client';
import { spec } from '../spec';
import { fileSchema, tags } from './project-analytics-schemas';

export const exportCohortMembersTool = SlateTool.create(spec, {
  name: 'Export Cohort Members',
  key: 'export_cohort_members',
  tags,
  description:
    'Start a downloadable cohort membership export with a cohortId from manage_cohorts, or resume an existing export with requestId. Polls for up to 20 seconds; pending responses retain the requestId for a later call without creating another export. Requires project API key and secret.',
  constraints: [
    'Provide exactly one of cohortId or requestId. Property options apply only to new exports.',
    'Maximum 32 MiB per invocation and 30 seconds per file download. Export requests remain downloadable for seven days. Cohort export may require a paid plan and consumes provider export quota.'
  ]
})
  .authMethods(['api_key_secret'])
  .input(
    z.object({
      cohortId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Cohort ID from manage_cohorts. Starts a new export; omit when resuming requestId.'
        ),
      requestId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Existing requestId from this tool or manage_cohorts download. Resumes without starting another export.'
        ),
      includeProperties: z
        .boolean()
        .optional()
        .describe(
          'For new exports: include user properties. Defaults to false unless propertyKeys is supplied.'
        ),
      propertyKeys: z
        .array(z.string().min(1))
        .min(1)
        .optional()
        .describe(
          'For new exports only: user property keys to include. Implies includeProperties=true; explicit false is invalid.'
        )
    })
  )
  .output(
    z.object({
      requestId: z.string(),
      cohortId: z.string().nullable(),
      status: z.enum(['pending', 'completed']),
      file: fileSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await createAnalyticsClient(ctx).exportCohortMembers(ctx.input);
    const extension =
      result.file?.contentType === 'application/gzip'
        ? 'json.gz'
        : result.file?.contentType.includes('json')
          ? 'json'
          : result.file?.contentType.includes('csv')
            ? 'csv'
            : 'bin';
    const file = result.file
      ? {
          fileName: `cohort-${createHash('sha256').update(result.requestId).digest('hex').slice(0, 12)}.${extension}`,
          contentType: result.file.contentType,
          byteLength: result.file.bytes.byteLength
        }
      : undefined;
    return {
      output: {
        requestId: result.requestId,
        cohortId: result.cohortId,
        status: result.status,
        file
      },
      attachments: result.file
        ? [
            createBase64Attachment(
              result.file.bytes.toString('base64'),
              result.file.contentType
            )
          ]
        : [],
      message:
        result.status === 'completed'
          ? 'Downloaded the cohort membership export.'
          : 'The export is pending. Resume with requestId to check again and download it when ready.'
    };
  })
  .build();
