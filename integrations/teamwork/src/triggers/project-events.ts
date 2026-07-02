import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let projectEvents = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description:
    'Triggers when a project is created, updated, archived, completed, reopened, or deleted in Teamwork.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of project event'),
      projectId: z.string().describe('ID of the affected project'),
      eventPayload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the affected project'),
      projectName: z.string().optional().describe('Project name'),
      description: z.string().optional().describe('Project description'),
      status: z.string().optional().describe('Project status'),
      companyId: z.string().optional().describe('Company ID'),
      companyName: z.string().optional().describe('Company name'),
      startDate: z.string().optional().describe('Start date'),
      endDate: z.string().optional().describe('End date'),
      updatedBy: z.string().optional().describe('ID of the user who triggered the event'),
      updatedByName: z.string().optional().describe('Name of the user who triggered the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let event = data.event || data;
      let project = event.project || event.objectData || {};
      let eventType = event.event || data.event || 'unknown';
      let projectId = project.id
        ? String(project.id)
        : event.objectId
          ? String(event.objectId)
          : '';

      if (!projectId) return { inputs: [] };

      return {
        inputs: [
          {
            eventType: String(eventType),
            projectId,
            eventPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.eventPayload;
      let event = payload?.event || payload;
      let project = event?.project || event?.objectData || {};
      let user = event?.user || event?.eventCreator || {};

      return {
        type: `project.${ctx.input.eventType.replace(/^PROJECT\./, '').toLowerCase()}`,
        id: `project-${ctx.input.projectId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          projectId: ctx.input.projectId,
          projectName: project.name || undefined,
          description: project.description || undefined,
          status: project.status || undefined,
          companyId: project.companyId
            ? String(project.companyId)
            : project['company-id']
              ? String(project['company-id'])
              : undefined,
          companyName: project.companyName || project['company-name'] || undefined,
          startDate: project['start-date'] || project.startDate || undefined,
          endDate: project['end-date'] || project.endDate || undefined,
          updatedBy: user.id ? String(user.id) : undefined,
          updatedByName: user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : undefined
        }
      };
    }
  })
  .build();
