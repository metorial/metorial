import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, integer, invalid, type Row, stringList, text, timestamp } from '../lib/contracts';
import { spec } from '../spec';

export let manageInterviewTool = SlateTool.create(spec, {
  name: 'Manage Interview',
  key: 'manage_interview',
  description: `Create, update or delete individual interviews on existing externally managed panels. Discover panels and feedback templates with list_resources.`,
  instructions: [
    'To create an interview, provide opportunityId, panelId, and interview details.',
    'To update an interview, provide interviewId and updated fields.',
    'To delete an interview, provide interviewId and set action to "delete".',
    'Only externally managed panels (created via API) can be modified through the API.'
  ],
  constraints: [
    'Only interviews on externally managed panels can be updated or deleted. Deleting the last interview deletes its panel.',
    'Replacement updates read and preserve current fields; concurrent changes after the final read remain possible.'
  ]
})
  .input(
    z.object({
      performAsUserId: z
        .string()
        .optional()
        .describe(
          'Acting user ID required for this write. Call list_users to discover authorized users.'
        ),
      action: z.enum(['create', 'update', 'delete']).describe('The action to perform'),
      opportunityId: z
        .string()
        .optional()
        .describe(
          'Opportunity ID required for every action. Discover it with list_opportunities.'
        ),
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
        .enum(['none', 'daily', 'frequent', 'frequently', 'once'])
        .optional()
        .describe('Feedback reminder frequency'),
      timezone: z
        .string()
        .optional()
        .describe(
          'Legacy field: timezone belongs to the panel and cannot be written by this endpoint'
        )
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
    const opportunityId = id(
      ctx.input.opportunityId,
      'Opportunity ID required for every interview action; discover it with list_opportunities'
    );
    const actor = id(ctx.input.performAsUserId, 'Acting user ID; discover it with list_users');
    if (ctx.input.timezone !== undefined)
      invalid(
        'Interview timezone is controlled by its panel and cannot be written on this endpoint. Select the correct panel with list_resources.'
      );
    const data: Row = {};
    for (const key of ['subject', 'location', 'note'] as const)
      if (ctx.input[key] !== undefined) data[key] = text(ctx.input[key], key, true);
    if (ctx.input.date !== undefined) data.date = timestamp(ctx.input.date, 'Interview date');
    if (ctx.input.duration !== undefined)
      data.duration = integer(ctx.input.duration, 'Interview duration', 1);
    if (ctx.input.interviewerIds !== undefined) {
      const interviewers = stringList(ctx.input.interviewerIds, 'Interviewer IDs', true);
      if (!interviewers.length) invalid('An interview requires at least one interviewer.');
      data.interviewers = interviewers.map(interviewerId => ({ id: interviewerId }));
    }
    if (ctx.input.feedbackTemplateId !== undefined)
      data.feedbackTemplate = id(
        ctx.input.feedbackTemplateId,
        'Feedback template ID; discover it with list_resources'
      );
    if (ctx.input.feedbackReminderFrequency !== undefined)
      data.feedbackReminder =
        ctx.input.feedbackReminderFrequency === 'frequent'
          ? 'frequently'
          : ctx.input.feedbackReminderFrequency;
    const client = new Client(ctx.auth);
    if (ctx.input.action === 'create') {
      if (ctx.input.interviewId !== undefined)
        invalid('Do not supply interviewId when creating an interview.');
      const panelId = id(ctx.input.panelId, 'Panel ID; discover it with list_resources');
      if (
        data.date === undefined ||
        data.duration === undefined ||
        data.interviewers === undefined
      )
        invalid('Creating an interview requires date, duration and at least one interviewer.');
      const result = await client.createInterview(opportunityId, panelId, data, actor);
      return {
        output: { interviewId: result.data.id, interview: result.data },
        message: `Created interview ${result.data.id}.`
      };
    }
    const interviewId = id(
      ctx.input.interviewId,
      'Interview ID; discover it with get_opportunity_activity'
    );
    if (ctx.input.action === 'delete') {
      if (Object.keys(data).length || ctx.input.panelId !== undefined)
        invalid('Interview field updates cannot be combined with deletion.');
      await client.deleteInterview(opportunityId, interviewId, actor);
      return {
        output: { interviewId, deleted: true },
        message: `Deleted interview ${interviewId}. Deleting a panel's last interview also deletes the panel.`
      };
    }
    if (ctx.input.panelId !== undefined)
      invalid('Moving interviews between panels is not supported by this tool.');
    if (!Object.keys(data).length) invalid('Provide at least one interview field to update.');
    const result = await client.updateInterview(opportunityId, interviewId, data, actor);
    return {
      output: { interviewId, interview: result.data },
      message: `Updated interview ${interviewId}.`
    };
  })
  .build();
