import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageInterviewTool = SlateTool.create(spec, {
  name: 'Manage Interview',
  key: 'manage_interview',
  description: `Create, update, or delete interviews and panels for opportunities. Use this to schedule interviews, assign interviewers, and manage interview panels.`,
  instructions: [
    'To create an interview, provide opportunityId, panelId, and interview details.',
    'To update an interview, provide interviewId and updated fields.',
    'To delete an interview, provide interviewId and set action to "delete".',
    'Only externally managed panels (created via API) can be modified through the API.'
  ],
  constraints: ['Only externally managed panels can be updated or deleted via the API.']
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The action to perform'),
      opportunityId: z.string().optional().describe('Opportunity ID (required for creating)'),
      panelId: z.string().optional().describe('Panel ID (required for creating an interview)'),
      interviewId: z
        .string()
        .optional()
        .describe('Interview ID (required for updating or deleting)'),
      subject: z.string().optional().describe('Interview subject/title'),
      date: z.string().optional().describe('Interview date (ISO 8601 timestamp)'),
      duration: z.number().optional().describe('Interview duration in minutes'),
      location: z.string().optional().describe('Interview location or meeting link'),
      note: z.string().optional().describe('Notes about the interview'),
      interviewerIds: z.array(z.string()).optional().describe('User IDs of interviewers'),
      feedbackTemplateId: z.string().optional().describe('Feedback template ID to use'),
      feedbackReminderFrequency: z
        .enum(['none', 'daily', 'frequent'])
        .optional()
        .describe('Feedback reminder frequency'),
      timezone: z.string().optional().describe('Timezone for the interview (IANA format)')
    })
  )
  .output(
    z.object({
      interviewId: z.string().optional().describe('ID of the created/updated interview'),
      deleted: z.boolean().optional().describe('True if the interview was deleted'),
      interview: z.any().optional().describe('The interview object (for create/update)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    if (ctx.input.action === 'delete') {
      if (!ctx.input.interviewId) throw new Error('interviewId is required for delete action');
      await client.deleteInterview(ctx.input.interviewId);
      return {
        output: {
          interviewId: ctx.input.interviewId,
          deleted: true
        },
        message: `Deleted interview **${ctx.input.interviewId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.interviewId) throw new Error('interviewId is required for update action');
      let updateData: Record<string, any> = {};
      if (ctx.input.subject) updateData.subject = ctx.input.subject;
      if (ctx.input.date) updateData.date = new Date(ctx.input.date).getTime();
      if (ctx.input.duration) updateData.duration = ctx.input.duration;
      if (ctx.input.location) updateData.location = ctx.input.location;
      if (ctx.input.note) updateData.note = ctx.input.note;
      if (ctx.input.interviewerIds)
        updateData.interviewers = ctx.input.interviewerIds.map(id => ({ userId: id }));
      if (ctx.input.feedbackTemplateId)
        updateData.feedbackTemplate = ctx.input.feedbackTemplateId;
      if (ctx.input.feedbackReminderFrequency)
        updateData.feedbackReminderFrequency = ctx.input.feedbackReminderFrequency;
      if (ctx.input.timezone) updateData.timezone = ctx.input.timezone;

      let result = await client.updateInterview(ctx.input.interviewId, updateData);
      return {
        output: {
          interviewId: result.data.id,
          interview: result.data
        },
        message: `Updated interview **${result.data.id}**.`
      };
    }

    // Create
    if (!ctx.input.opportunityId)
      throw new Error('opportunityId is required for create action');
    if (!ctx.input.panelId) throw new Error('panelId is required for create action');

    let createData: Record<string, any> = {};
    if (ctx.input.subject) createData.subject = ctx.input.subject;
    if (ctx.input.date) createData.date = new Date(ctx.input.date).getTime();
    if (ctx.input.duration) createData.duration = ctx.input.duration;
    if (ctx.input.location) createData.location = ctx.input.location;
    if (ctx.input.note) createData.note = ctx.input.note;
    if (ctx.input.interviewerIds)
      createData.interviewers = ctx.input.interviewerIds.map(id => ({ userId: id }));
    if (ctx.input.feedbackTemplateId)
      createData.feedbackTemplate = ctx.input.feedbackTemplateId;
    if (ctx.input.feedbackReminderFrequency)
      createData.feedbackReminderFrequency = ctx.input.feedbackReminderFrequency;
    if (ctx.input.timezone) createData.timezone = ctx.input.timezone;

    let result = await client.createInterview(
      ctx.input.opportunityId,
      ctx.input.panelId,
      createData
    );
    return {
      output: {
        interviewId: result.data.id,
        interview: result.data
      },
      message: `Created interview **${result.data.id}** for opportunity ${ctx.input.opportunityId}.`
    };
  })
  .build();
