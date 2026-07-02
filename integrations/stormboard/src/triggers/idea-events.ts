import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let ideaEvents = SlateTrigger.create(spec, {
  name: 'Idea Events',
  key: 'idea_events',
  description:
    'Triggered when an idea is created, deleted, or moved within a Storm. Configure the webhook URL in Stormboard account settings (My Account → Webhooks).',
  instructions: [
    'Configure the webhook in your Stormboard account at My Account → Webhooks.',
    'Set the Payload URL to the provided webhook URL and select the idea-related events you want to receive.'
  ]
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of the event (IdeaCreated, IdeaDeleted, IdeaSection)'),
      eventId: z.number().describe('Unique event ID'),
      date: z.string().describe('Event timestamp'),
      stormId: z.number().describe('Storm ID'),
      stormTitle: z.string().describe('Storm title'),
      ideaId: z.number().describe('Idea ID'),
      ideaType: z.number().optional().describe('Idea type identifier'),
      ideaText: z.string().optional().describe('Idea text content'),
      userName: z.string().optional().describe('Name of the user who triggered the event'),
      userFullName: z.string().optional().describe('Full name of the user'),
      userId: z.number().optional().describe('User ID'),
      destinationChar: z
        .string()
        .optional()
        .describe('Destination section character (for moved events)'),
      destinationTitle: z
        .string()
        .optional()
        .describe('Destination section title (for moved events)')
    })
  )
  .output(
    z.object({
      ideaId: z.number().describe('ID of the affected idea'),
      stormId: z.number().describe('ID of the Storm'),
      stormTitle: z.string().describe('Title of the Storm'),
      ideaText: z.string().optional().describe('Text content of the idea'),
      ideaType: z.number().optional().describe('Idea type identifier'),
      userName: z.string().optional().describe('Name of the user'),
      userFullName: z.string().optional().describe('Full name of the user'),
      userId: z.number().optional().describe('User ID'),
      destinationChar: z
        .string()
        .optional()
        .describe('Destination section character (for moved events)'),
      destinationTitle: z
        .string()
        .optional()
        .describe('Destination section title (for moved events)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let events = Array.isArray(body) ? body : [body];

      let inputs = events
        .filter((evt: any) => ['IdeaCreated', 'IdeaDeleted', 'IdeaSection'].includes(evt.type))
        .map((evt: any) => ({
          eventType: evt.type,
          eventId: evt.id,
          date: evt.date,
          stormId: evt.storm?.id,
          stormTitle: evt.storm?.title,
          ideaId: evt.idea?.id,
          ideaType: evt.idea?.type,
          ideaText: evt.idea?.text,
          userName: evt.user?.name,
          userFullName: evt.user?.full,
          userId: evt.user?.id,
          destinationChar: evt.to?.char,
          destinationTitle: evt.to?.title
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        IdeaCreated: 'idea.created',
        IdeaDeleted: 'idea.deleted',
        IdeaSection: 'idea.moved'
      };

      return {
        type: typeMap[ctx.input.eventType] || `idea.${ctx.input.eventType.toLowerCase()}`,
        id: `${ctx.input.eventId}`,
        output: {
          ideaId: ctx.input.ideaId,
          stormId: ctx.input.stormId,
          stormTitle: ctx.input.stormTitle,
          ideaText: ctx.input.ideaText,
          ideaType: ctx.input.ideaType,
          userName: ctx.input.userName,
          userFullName: ctx.input.userFullName,
          userId: ctx.input.userId,
          destinationChar: ctx.input.destinationChar,
          destinationTitle: ctx.input.destinationTitle
        }
      };
    }
  })
  .build();
