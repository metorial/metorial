import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { submissionSchema } from '../lib/types';
import { spec } from '../spec';

export let createSubmission = SlateTool.create(spec, {
  name: 'Create Submission',
  key: 'create_submission',
  description: `Programmatically create one or more submissions for a form. Each submission must include question responses with matching question IDs and values. Optionally set URL parameters, scheduling, payment, and login data.`,
  instructions: [
    "Question IDs must match the form's question definitions. Use the **Get Form** tool to discover question IDs.",
    'Submissions created via API will **not** trigger email notifications, workflows, or integrations.'
  ],
  constraints: ['Maximum of 10 submissions per request.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      formId: z.string().describe('Public identifier of the form'),
      submissions: z
        .array(
          z.object({
            questions: z
              .array(
                z.object({
                  id: z.string().describe('Question ID from the form definition'),
                  value: z.any().describe('Response value for the question')
                })
              )
              .describe('Array of question responses'),
            urlParameters: z
              .array(
                z.object({
                  id: z.string().describe('URL parameter ID'),
                  value: z.any().describe('URL parameter value')
                })
              )
              .optional()
              .describe('URL parameter values'),
            submissionTime: z.string().optional().describe('ISO 8601 submission timestamp'),
            lastUpdatedAt: z.string().optional().describe('ISO 8601 last updated timestamp'),
            scheduling: z
              .array(
                z.object({
                  id: z.string().describe('Scheduling field ID'),
                  value: z.any().describe('Scheduling value')
                })
              )
              .optional()
              .describe('Scheduling field values'),
            payments: z
              .array(
                z.object({
                  id: z.string().describe('Payment field ID'),
                  value: z.any().describe('Payment value')
                })
              )
              .optional()
              .describe('Payment field values'),
            login: z
              .object({
                email: z.string().describe('Verified email address')
              })
              .optional()
              .describe('Login information')
          })
        )
        .min(1)
        .max(10)
        .describe('Array of submissions to create (max 10)')
    })
  )
  .output(
    z.object({
      submissions: z.array(submissionSchema).describe('Created submission objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl || ctx.config.baseUrl
    });

    let result = await client.createSubmissions(ctx.input.formId, ctx.input.submissions);

    let submissions = result.submissions ?? result;

    return {
      output: { submissions },
      message: `Created **${submissions.length}** submission(s) for form \`${ctx.input.formId}\`.`
    };
  })
  .build();
