import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import {
  id,
  invalid,
  mapApplication,
  pageSchema,
  row,
  unexpected,
  warningsSchema
} from '../lib/contracts';
import { spec } from '../spec';

let updateApplicationOutputSchema = z.object({
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
  updatedAt: z.string().describe('Last update timestamp')
});

export let updateApplicationTool = SlateTool.create(spec, {
  name: 'Update Application',
  key: 'update_application',
  description: `Updates an existing application in Ashby. Supports multiple actions: change the interview stage (optionally with an archive reason), change the application source, transfer the application to a different job, and add or remove hiring team members. Multiple actions can be performed in a single call.`,
  instructions: [
    'Provide the applicationId and at least one action to perform.',
    'To change the interview stage, provide interviewStageId. If moving to an archived stage, also provide archiveReasonId.',
    'To change the source, provide sourceId.',
    'To transfer to a different job, provide transferToJobId, transferToInterviewStageId and a target interview plan; the exact target job default plan is used only when available.',
    'To add a hiring team member, provide addHiringTeamMember with userId and role.',
    'To remove a hiring team member, provide removeHiringTeamMember with userId and role.',
    'Actions run sequentially, may retain automation/history, and are not atomic. A partial-write error identifies confirmed prior operations; read exact state before retrying.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('ID of the application to update'),
      interviewStageId: z
        .string()
        .optional()
        .describe('ID of the interview stage to move the application to'),
      archiveReasonId: z
        .string()
        .optional()
        .describe('ID of the archive reason (required when moving to an archived stage)'),
      sourceId: z
        .string()
        .optional()
        .describe('ID of the new source to set on the application'),
      transferToJobId: z
        .string()
        .optional()
        .describe('ID of the job to transfer the application to'),
      transferToInterviewPlanId: z
        .string()
        .optional()
        .describe('ID of the interview plan to use when transferring to a new job'),
      transferToInterviewStageId: z
        .string()
        .optional()
        .describe(
          'Required target stage ID for transfer. Use list_organization interview_stages with the target plan.'
        ),
      startAutomaticActivities: z
        .boolean()
        .optional()
        .describe(
          'Whether to start the target stage automatic activities on transfer; the provider defaults to true.'
        ),
      addHiringTeamMember: z
        .object({
          userId: z.string().describe('ID of the user to add to the hiring team'),
          role: z
            .string()
            .describe(
              'Role of the hiring team member (e.g., "Hiring Manager", "Recruiter", "Sourcer")'
            )
        })
        .optional()
        .describe('Add a user to the hiring team for this application'),
      removeHiringTeamMember: z
        .object({
          userId: z.string().describe('ID of the user to remove from the hiring team'),
          role: z.string().describe('Role of the hiring team member to remove')
        })
        .optional()
        .describe('Remove a user from the hiring team for this application')
    })
  )
  .output(
    updateApplicationOutputSchema.extend({
      warnings: warningsSchema,
      pageInfo: pageSchema.optional(),
      completedActions: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new AshbyClient(ctx.auth),
      input = ctx.input,
      applicationId = id(input.applicationId, 'Application ID');
    const stage =
        input.interviewStageId === undefined
          ? undefined
          : id(input.interviewStageId, 'Interview stage ID'),
      archiveReasonId =
        input.archiveReasonId === undefined
          ? undefined
          : id(input.archiveReasonId, 'Archive reason ID'),
      sourceId = input.sourceId === undefined ? undefined : id(input.sourceId, 'Source ID'),
      targetJob =
        input.transferToJobId === undefined
          ? undefined
          : id(input.transferToJobId, 'Target job ID');
    if (archiveReasonId !== undefined && stage === undefined)
      invalid('archiveReasonId applies only to a stage change.');
    if (
      targetJob === undefined &&
      (input.transferToInterviewPlanId !== undefined ||
        input.transferToInterviewStageId !== undefined ||
        input.startAutomaticActivities !== undefined)
    )
      invalid('Transfer options require transferToJobId.');
    const transferStage =
      input.transferToInterviewStageId === undefined
        ? undefined
        : id(input.transferToInterviewStageId, 'Target interview stage ID');
    if (targetJob !== undefined && transferStage === undefined)
      invalid(
        'Transfer requires transferToInterviewStageId. Discover the target plan and its stages through list_organization; the API has no default transfer stage.'
      );
    const add =
        input.addHiringTeamMember === undefined
          ? undefined
          : {
              teamMemberId: id(input.addHiringTeamMember.userId, 'Hiring team user ID'),
              roleId: await client.roleId(input.addHiringTeamMember.role)
            },
      remove =
        input.removeHiringTeamMember === undefined
          ? undefined
          : {
              teamMemberId: id(input.removeHiringTeamMember.userId, 'Hiring team user ID'),
              roleId: await client.roleId(input.removeHiringTeamMember.role)
            };
    let plan =
      input.transferToInterviewPlanId === undefined
        ? undefined
        : id(input.transferToInterviewPlanId, 'Target interview plan ID');
    if (targetJob !== undefined && plan === undefined) {
      const job = row((await client.getJob(targetJob)).results);
      if (job.defaultInterviewPlanId === undefined)
        invalid(
          'Target job has no default plan. Provide transferToInterviewPlanId explicitly.'
        );
      plan = id(job.defaultInterviewPlanId, 'Target default interview plan ID');
    }
    const steps: { label: string; run: () => Promise<unknown> }[] = [];
    if (stage !== undefined)
      steps.push({
        label: 'application.changeStage',
        run: () =>
          client.post('/application.changeStage', {
            applicationId,
            interviewStageId: stage,
            archiveReasonId
          })
      });
    if (sourceId !== undefined)
      steps.push({
        label: 'application.changeSource',
        run: () => client.post('/application.changeSource', { applicationId, sourceId })
      });
    if (targetJob !== undefined)
      steps.push({
        label: 'application.transfer',
        run: () =>
          client.post('/application.transfer', {
            applicationId,
            jobId: targetJob,
            interviewPlanId: plan,
            interviewStageId: transferStage,
            startAutomaticActivities: input.startAutomaticActivities
          })
      });
    if (add !== undefined)
      steps.push({
        label: 'application.addHiringTeamMember',
        run: () => client.post('/application.addHiringTeamMember', { applicationId, ...add })
      });
    if (remove !== undefined)
      steps.push({
        label: 'application.removeHiringTeamMember',
        run: () =>
          client.post('/application.removeHiringTeamMember', { applicationId, ...remove })
      });
    if (!steps.length)
      invalid('Provide at least one stage, source, transfer or hiring-team change.');
    let output: ReturnType<typeof mapApplication> | undefined;
    const completedActions = await client.sequence([
      ...steps,
      {
        label: 'application.readback',
        run: async () => {
          output = mapApplication((await client.getApplication(applicationId)).results);
          if (targetJob !== undefined && output.jobId !== targetJob) unexpected();
        }
      }
    ]);
    if (!output) unexpected();
    return {
      output: { ...output, warnings: client.warnings, completedActions },
      message:
        'Application operations accepted and exact state read back. Operations are not atomic; automatic activities and history may be retained.'
    };
  })
  .build();
