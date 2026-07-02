import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
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

let mapApplication = (app: any) => ({
  applicationId: app.id,
  status: app.status || '',
  candidateName:
    app.candidate?.name ||
    [app.candidate?.firstName, app.candidate?.lastName].filter(Boolean).join(' ') ||
    'Unknown',
  candidateId: app.candidate?.id || app.candidateId || '',
  jobTitle: app.job?.title || '',
  jobId: app.job?.id || app.jobId || '',
  currentStage: app.currentInterviewStage
    ? {
        stageId: app.currentInterviewStage.id,
        title: app.currentInterviewStage.title || ''
      }
    : undefined,
  source: app.source
    ? {
        sourceId: app.source.id,
        title: app.source.title || ''
      }
    : undefined,
  createdAt: app.createdAt || '',
  updatedAt: app.updatedAt || ''
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
      nextCursor: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AshbyClient({ token: ctx.auth.token });
    let { applicationId, cursor, perPage, expand } = ctx.input;

    if (applicationId) {
      let result = await client.getApplication(applicationId, expand);
      let application = mapApplication(result.results);

      return {
        output: { application },
        message: `Retrieved application **${application.applicationId}** for ${application.candidateName} - ${application.jobTitle}.`
      };
    }

    let result = await client.listApplications({ cursor, perPage });
    let applications = (result.results || []).map(mapApplication);

    return {
      output: {
        applications,
        nextCursor: result.moreDataAvailable ? result.nextCursor : undefined
      },
      message: `Found **${applications.length}** applications${result.moreDataAvailable ? ' (more available)' : ''}.`
    };
  })
  .build();
