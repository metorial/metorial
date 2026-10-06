import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import {
  invalid,
  mapApplication,
  pageOutput,
  pageSchema,
  rows,
  warningsSchema
} from '../lib/contracts';
import { spec } from '../spec';

let applicationOutputSchema = z.object({
  applicationId: z.string().describe('Application ID'),
  status: z.string().describe('Application status'),
  candidateName: z.string().describe('Candidate name'),
  candidateId: z.string().describe('Candidate ID'),
  jobTitle: z.string().describe('Job title'),
  jobId: z.string().describe('Job ID'),
  currentStage: z
    .object({
      stageId: z.string().describe('Interview stage ID'),
      title: z.string().describe('Interview stage title')
    })
    .optional()
    .describe('Current interview stage'),
  source: z
    .object({
      sourceId: z.string().describe('Source ID'),
      title: z.string().describe('Source title')
    })
    .optional()
    .describe('Application source'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last updated timestamp')
});

export let listApplicationsTool = SlateTool.create(spec, {
  name: 'List Applications',
  key: 'list_applications',
  description: `Lists applications with pagination or retrieves detailed information about a specific application. Applications represent a candidate's progress through the hiring pipeline for a particular job.`,
  instructions: [
    'To get a specific application, provide applicationId.',
    'To list all applications with pagination, omit applicationId and optionally provide cursor and perPage.',
    'Use the expand parameter to include additional related data like openings, form submissions, or referrals.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z.string().optional().describe('Application ID to get specific details'),
      cursor: z.string().optional().describe('Pagination cursor'),
      syncToken: z
        .string()
        .optional()
        .describe(
          'Incremental sync token. Preserve it with each cursor; restart without both values if expired.'
        ),
      perPage: z.number().optional().describe('Number of results per page'),
      expand: z
        .array(z.enum(['openings', 'applicationFormSubmissions', 'referrals']))
        .optional()
        .describe('Related data to expand and include in the response')
    })
  )
  .output(
    z.object({
      application: applicationOutputSchema
        .optional()
        .describe('Single application details (when applicationId is provided)'),
      applications: z
        .array(applicationOutputSchema)
        .optional()
        .describe('List of applications (when listing)'),
      nextCursor: z.string().optional().describe('Pagination cursor for the next page'),
      warnings: warningsSchema,
      pageInfo: pageSchema.optional(),
      completedActions: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new AshbyClient(ctx.auth),
      input = ctx.input;
    if (input.applicationId !== undefined) {
      if (input.cursor !== undefined || input.syncToken !== undefined)
        invalid('Pagination parameters cannot be used with an exact applicationId.');
      const result = await client.getApplication(input.applicationId, input.expand);
      return {
        output: { application: mapApplication(result.results), warnings: client.warnings },
        message: 'Retrieved the exact visible application.'
      };
    }
    const result = await client.list('/application.list', input, { expand: input.expand });
    return {
      output: {
        applications: rows(result.results).map(mapApplication),
        ...pageOutput(result),
        warnings: client.warnings
      },
      message:
        'Retrieved one application page. Follow pageInfo until moreDataAvailable is false.'
    };
  })
  .build();
