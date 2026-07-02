import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
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

let mapUpdatedApplicationToOutput = (results: any) => ({
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
  updatedAt: results.updatedAt
});

export let updateApplicationTool = SlateTool.create(spec, {
  name: 'Update Application',
  key: 'update_application',
  description: `Updates an existing application in Ashby. Supports multiple actions: change the interview stage (optionally with an archive reason), change the application source, transfer the application to a different job, and add or remove hiring team members. Multiple actions can be performed in a single call.`,
  instructions: [
    'Provide the applicationId and at least one action to perform.',
    'To change the interview stage, provide interviewStageId. If moving to an archived stage, also provide archiveReasonId.',
    'To change the source, provide sourceId.',
    'To transfer to a different job, provide transferToJobId and optionally transferToInterviewPlanId.',
    'To add a hiring team member, provide addHiringTeamMember with userId and role.',
    'To remove a hiring team member, provide removeHiringTeamMember with userId and role.',
    'All actions are executed sequentially, and the final application state is returned.'
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
  .output(updateApplicationOutputSchema)
  .handleInvocation(async ctx => {
    let client = new AshbyClient({ token: ctx.auth.token });
    let applicationId = ctx.input.applicationId;
    let actions: string[] = [];

    if (ctx.input.interviewStageId !== undefined) {
      let stageParams: Record<string, any> = {
        applicationId,
        interviewStageId: ctx.input.interviewStageId
      };
      if (ctx.input.archiveReasonId !== undefined) {
        stageParams.archiveReasonId = ctx.input.archiveReasonId;
      }
      await client.changeApplicationStage(stageParams as any);
      actions.push('changed stage');
    }

    if (ctx.input.sourceId !== undefined) {
      await client.changeApplicationSource({
        applicationId,
        sourceId: ctx.input.sourceId
      });
      actions.push('changed source');
    }

    if (ctx.input.transferToJobId !== undefined) {
      let transferParams: Record<string, any> = {
        applicationId,
        jobId: ctx.input.transferToJobId
      };
      if (ctx.input.transferToInterviewPlanId !== undefined) {
        transferParams.interviewPlanId = ctx.input.transferToInterviewPlanId;
      }
      await client.transferApplication(transferParams as any);
      actions.push('transferred to new job');
    }

    if (ctx.input.addHiringTeamMember !== undefined) {
      await client.addHiringTeamMember({
        applicationId,
        userId: ctx.input.addHiringTeamMember.userId,
        role: ctx.input.addHiringTeamMember.role
      });
      actions.push(`added hiring team member`);
    }

    if (ctx.input.removeHiringTeamMember !== undefined) {
      await client.removeHiringTeamMember({
        applicationId,
        userId: ctx.input.removeHiringTeamMember.userId,
        role: ctx.input.removeHiringTeamMember.role
      });
      actions.push(`removed hiring team member`);
    }

    let response = await client.getApplication(applicationId);
    let results = response.results;
    let output = mapUpdatedApplicationToOutput(results);

    let actionSummary = actions.length > 0 ? actions.join(', ') : 'no changes applied';

    return {
      output,
      message: `Updated application **${applicationId}** for **${output.candidateName}** on **${output.jobTitle}**: ${actionSummary}`
    };
  })
  .build();
