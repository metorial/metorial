import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let milestoneEvents = SlateTrigger.create(spec, {
  name: 'Milestone Events',
  key: 'milestone_events',
  description:
    'Triggers when a milestone is created, updated, completed, reopened, or deleted in Teamwork.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of milestone event'),
      milestoneId: z.string().describe('ID of the affected milestone'),
      projectId: z.string().optional().describe('Project ID'),
      eventPayload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      milestoneId: z.string().describe('ID of the affected milestone'),
      title: z.string().optional().describe('Milestone title'),
      projectId: z.string().optional().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      deadline: z.string().optional().describe('Milestone deadline'),
      completed: z.boolean().optional().describe('Whether the milestone is completed'),
      responsiblePartyIds: z
        .string()
        .optional()
        .describe('Comma-separated responsible party IDs'),
      updatedBy: z.string().optional().describe('ID of the user who triggered the event'),
      updatedByName: z.string().optional().describe('Name of the user who triggered the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let event = data.event || data;
      let milestone = event.milestone || event.objectData || {};
      let eventType = event.event || data.event || 'unknown';
      let milestoneId = milestone.id
        ? String(milestone.id)
        : event.objectId
          ? String(event.objectId)
          : '';

      if (!milestoneId) return { inputs: [] };

      return {
        inputs: [
          {
            eventType: String(eventType),
            milestoneId,
            projectId: milestone.projectId
              ? String(milestone.projectId)
              : milestone['project-id']
                ? String(milestone['project-id'])
                : undefined,
            eventPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.eventPayload;
      let event = payload?.event || payload;
      let milestone = event?.milestone || event?.objectData || {};
      let user = event?.user || event?.eventCreator || {};

      return {
        type: `milestone.${ctx.input.eventType.replace(/^MILESTONE\./, '').toLowerCase()}`,
        id: `milestone-${ctx.input.milestoneId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          milestoneId: ctx.input.milestoneId,
          title: milestone.title || milestone.name || undefined,
          projectId: ctx.input.projectId || undefined,
          projectName: milestone.projectName || milestone['project-name'] || undefined,
          deadline: milestone.deadline || undefined,
          completed: milestone.completed ?? undefined,
          responsiblePartyIds:
            milestone['responsible-party-ids'] || milestone.responsiblePartyIds || undefined,
          updatedBy: user.id ? String(user.id) : undefined,
          updatedByName: user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : undefined
        }
      };
    }
  })
  .build();
