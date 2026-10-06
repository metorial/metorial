import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { id, mapApplication, pageSchema, unexpected, warningsSchema } from '../lib/contracts';
import { spec } from '../spec';

let applicationOutputSchema = z.object({
  applicationId: z.string().describe('Unique ID of the application'),
  status: z.string().describe('Current status of the application'),
  candidateName: z.string().describe('Name of the candidate'),
  jobTitle: z.string().describe('Title of the job'),
  currentStage: z
    .object({
      stageId: z.string().describe('ID of the current interview stage'),
      title: z.string().describe('Title of the current interview stage')
    })
    .optional()
    .describe('Current interview stage, if any'),
  candidateId: z.string().optional(),
  jobId: z.string().optional(),
  createdAt: z.string().describe('Creation timestamp')
});

export { applicationOutputSchema };

export const mapApplicationToOutput = mapApplication;

export let createApplicationTool = SlateTool.create(spec, {
  name: 'Create Application',
  key: 'create_application',
  description: `Creates a new application for a candidate on a job in Ashby. An application represents a candidate's progression through the hiring pipeline for a specific job. Optionally specify an interview plan, starting stage, source, or credited user.`,
  instructions: [
    'Both candidateId and jobId are required. Use the candidate and job listing tools to find valid IDs.',
    'Optionally provide an interviewPlanId and interviewStageId to start the application at a specific stage.',
    'Use sourceId to attribute where the candidate came from, and creditedToUserId to credit a specific user.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      candidateId: z.string().describe('ID of the candidate to create the application for'),
      jobId: z.string().describe('ID of the job to apply the candidate to'),
      interviewPlanId: z.string().optional().describe('ID of the interview plan to use'),
      interviewStageId: z
        .string()
        .optional()
        .describe('ID of the interview stage to start the application at'),
      sourceId: z
        .string()
        .optional()
        .describe('ID of the source to attribute the application to'),
      creditedToUserId: z
        .string()
        .optional()
        .describe('ID of the user to credit for this application')
    })
  )
  .output(
    applicationOutputSchema.extend({
      warnings: warningsSchema,
      pageInfo: pageSchema.optional(),
      completedActions: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new AshbyClient(ctx.auth),
      input = ctx.input;
    const body = {
      candidateId: id(input.candidateId, 'Candidate ID'),
      jobId: id(input.jobId, 'Job ID'),
      interviewPlanId:
        input.interviewPlanId === undefined
          ? undefined
          : id(input.interviewPlanId, 'Interview plan ID'),
      interviewStageId:
        input.interviewStageId === undefined
          ? undefined
          : input.interviewStageId === 'FirstPreInterviewScreen'
            ? input.interviewStageId
            : id(input.interviewStageId, 'Interview stage ID'),
      sourceId: input.sourceId === undefined ? undefined : id(input.sourceId, 'Source ID'),
      creditedToUserId:
        input.creditedToUserId === undefined
          ? undefined
          : id(input.creditedToUserId, 'Credited user ID')
    };
    const result = await client.post('/application.create', body),
      output = mapApplication(result.results);
    if (output.candidateId !== body.candidateId || output.jobId !== body.jobId) unexpected();
    return {
      output: { ...output, warnings: client.warnings },
      message:
        'Application creation accepted. Recruiting history and configured automatic activities may be retained.'
    };
  })
  .build();
