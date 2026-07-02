import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
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
  createdAt: z.string().describe('Creation timestamp')
});

export { applicationOutputSchema };

export let mapApplicationToOutput = (results: any) => ({
  applicationId: results.id,
  status: results.status,
  candidateName: results.candidate?.name || '',
  jobTitle: results.job?.title || '',
  ...(results.currentInterviewStage
    ? {
        currentStage: {
          stageId: results.currentInterviewStage.id,
          title: results.currentInterviewStage.title
        }
      }
    : {}),
  createdAt: results.createdAt
});

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
  .output(applicationOutputSchema)
  .handleInvocation(async ctx => {
    let client = new AshbyClient({ token: ctx.auth.token });

    let params: Record<string, any> = {
      candidateId: ctx.input.candidateId,
      jobId: ctx.input.jobId
    };

    if (ctx.input.interviewPlanId !== undefined)
      params.interviewPlanId = ctx.input.interviewPlanId;
    if (ctx.input.interviewStageId !== undefined)
      params.interviewStageId = ctx.input.interviewStageId;
    if (ctx.input.sourceId !== undefined) params.sourceId = ctx.input.sourceId;
    if (ctx.input.creditedToUserId !== undefined)
      params.creditedToUserId = ctx.input.creditedToUserId;

    let response = await client.createApplication(params as any);
    let results = response.results;

    let output = mapApplicationToOutput(results);

    return {
      output,
      message: `Created application for **${output.candidateName}** on job **${output.jobTitle}**`
    };
  })
  .build();
