import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let importFeedback = SlateTool.create(spec, {
  name: 'Import Feedback',
  key: 'import_feedback',
  description:
    'Import historical survey scores and comments into a campaign without sending surveys. Imported feedback affects scores and trends. Set response_date for historical responses; review the result for skipped, failed, and warning details.',
  constraints: [
    'Maximum 200 feedback items per request.',
    'Scores must fit the campaign metric.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .describe('Campaign ID. Call get_campaigns to discover campaigns and their metric.'),
      feedback: z
        .array(
          z.object({
            email: z.string().describe('Respondent email address'),
            score: z.number().int().describe('Primary score in the campaign metric’s range'),
            comment: z.string().optional().describe('Main open-ended answer'),
            first_name: z.string().optional().describe('Customer first name'),
            last_name: z.string().optional().describe('Customer last name'),
            company: z.string().optional().describe('Customer company'),
            job_title: z.string().optional().describe('Customer job title'),
            phone: z.string().optional().describe('Customer phone'),
            country: z.string().optional().describe('Customer country'),
            state: z.string().optional().describe('Customer state or region'),
            city: z.string().optional().describe('Customer city'),
            tags: z.array(z.string()).optional().describe('Feedback tags'),
            customer_tags: z.array(z.string()).optional().describe('Customer tags'),
            topics: z
              .array(
                z.object({
                  name: z.string().describe('Topic name'),
                  sentiment: z
                    .enum(['positive', 'neutral', 'negative'])
                    .describe('Topic sentiment')
                })
              )
              .optional()
              .describe('Feedback topics'),
            response_date: z
              .string()
              .optional()
              .describe(
                'ISO 8601 response date; set for historical imports. UNIX timestamps are not supported.'
              ),
            send_date: z
              .string()
              .optional()
              .describe('Original survey send date in ISO 8601 format'),
            open_date: z
              .string()
              .optional()
              .describe('Original survey open date in ISO 8601 format')
          })
        )
        .min(1)
        .max(200)
        .describe('Historical responses to import'),
      options: z
        .object({
          create_customers: z
            .boolean()
            .optional()
            .describe('Create missing customers (default: true)'),
          update_existing_customers: z
            .boolean()
            .optional()
            .describe('Update existing customer data (default: false)'),
          skip_duplicates: z
            .boolean()
            .optional()
            .describe('Skip duplicates within the time window (default: true)'),
          duplicate_check_window: z
            .number()
            .int()
            .min(1)
            .max(365)
            .optional()
            .describe('Duplicate window in days (default: 30)'),
          default_send_date: z
            .string()
            .optional()
            .describe('ISO 8601 fallback for omitted send/open dates')
        })
        .optional()
        .describe('Import and duplicate handling options'),
      idempotencyKey: z
        .string()
        .optional()
        .describe(
          'Reuse a key when retrying the same batch; provider retains the original result for 24 hours.'
        )
    })
  )
  .output(
    z.object({
      result: z
        .any()
        .describe(
          'Import counts, skipped and failed rows, warnings, and customer creation or update counts'
        )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).importFeedback(
      {
        campaign_id: ctx.input.campaignId,
        feedback: ctx.input.feedback,
        options: ctx.input.options
      },
      ctx.input.idempotencyKey
    );
    return {
      output: { result },
      message:
        'Feedback import processed. Check the result for imported, skipped, and failed items.'
    };
  })
  .build();
