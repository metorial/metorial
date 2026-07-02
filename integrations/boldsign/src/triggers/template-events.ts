import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let templateEvents = SlateTrigger.create(spec, {
  name: 'Template Events',
  key: 'template_events',
  description:
    'Triggered when template lifecycle events occur, such as created, edited, or creation failed. Covers all template-related webhook events from BoldSign.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID for deduplication'),
      eventType: z.string().describe('Type of template event'),
      created: z.number().describe('Unix timestamp of the event'),
      environment: z.string().optional().describe('Event environment (Live or Test)'),
      templateId: z.string().describe('ID of the affected template'),
      templateName: z.string().optional().describe('Name of the template'),
      templateStatus: z.string().optional().describe('Current status of the template'),
      creatorName: z.string().optional().describe('Name of the template creator'),
      creatorEmail: z.string().optional().describe('Email of the template creator'),
      actorType: z.string().optional().describe('Type of actor who triggered the event'),
      actorId: z.string().optional().describe('ID of the actor who triggered the event')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the affected template'),
      templateName: z.string().optional().describe('Name of the template'),
      templateStatus: z.string().optional().describe('Current status of the template'),
      eventType: z.string().describe('Type of event that occurred'),
      eventTimestamp: z.number().describe('Unix timestamp of the event'),
      environment: z.string().optional().describe('Event environment (Live or Test)'),
      creatorName: z.string().optional().describe('Name of the template creator'),
      creatorEmail: z.string().optional().describe('Email of the template creator'),
      actorType: z.string().optional().describe('Type of actor who triggered the event'),
      actorId: z.string().optional().describe('ID of the actor who triggered the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, any>;

      // Handle verification requests from BoldSign
      if (body?.event?.eventType === 'Verification') {
        return { inputs: [] };
      }

      let event = body?.event;
      let data = body?.data;
      let context = body?.context;

      if (!event || !data) {
        return { inputs: [] };
      }

      let eventType = event.eventType as string;

      let templateEventTypes = [
        'TemplateCreated',
        'TemplateEdited',
        'TemplateCreateFailed',
        'TemplateDraftCreated',
        'TemplateSendFailed'
      ];

      if (!templateEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventId: event.id,
            eventType,
            created: event.created,
            environment: event.environment,
            templateId: data.templateId,
            templateName: data.templateName ?? data.title,
            templateStatus: data.status,
            creatorName: data.senderDetail?.name ?? data.creatorDetail?.name,
            creatorEmail: data.senderDetail?.emailAddress ?? data.creatorDetail?.emailAddress,
            actorType: context?.actor?.userType,
            actorId: context?.actor?.id
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType;

      let typeMap: Record<string, string> = {
        TemplateCreated: 'template.created',
        TemplateEdited: 'template.edited',
        TemplateCreateFailed: 'template.create_failed',
        TemplateDraftCreated: 'template.draft_created',
        TemplateSendFailed: 'template.send_failed'
      };

      return {
        type: typeMap[eventType] ?? `template.${eventType.toLowerCase()}`,
        id: ctx.input.eventId,
        output: {
          templateId: ctx.input.templateId,
          templateName: ctx.input.templateName,
          templateStatus: ctx.input.templateStatus,
          eventType: ctx.input.eventType,
          eventTimestamp: ctx.input.created,
          environment: ctx.input.environment,
          creatorName: ctx.input.creatorName,
          creatorEmail: ctx.input.creatorEmail,
          actorType: ctx.input.actorType,
          actorId: ctx.input.actorId
        }
      };
    }
  })
  .build();
