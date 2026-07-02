import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { spec } from '../spec';

export let pushDigitalInteraction = SlateTool.create(spec, {
  name: 'Push Digital Interaction',
  key: 'push_digital_interaction',
  description: `Push digital interaction events into Gong's activity timeline. Supports events like content shares and content views, enabling external engagement data to appear alongside calls and emails in Gong.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      events: z
        .array(
          z.object({
            eventType: z
              .string()
              .describe('Type of event (e.g., "ContentShared", "ContentViewed")'),
            eventId: z.string().describe('Unique event identifier'),
            personName: z.string().optional().describe('Name of the person involved'),
            contactEmail: z.string().optional().describe('Email of the contact involved'),
            contactPhone: z.string().optional().describe('Phone number of the contact'),
            contentId: z.string().optional().describe('Identifier for the content'),
            contentTitle: z.string().optional().describe('Title of the content'),
            contentUrl: z.string().optional().describe('URL of the content'),
            eventTimestamp: z.string().describe('When the event occurred in ISO 8601 format'),
            workspaceId: z.string().optional().describe('Workspace ID'),
            customData: z
              .record(z.string(), z.string())
              .optional()
              .describe('Additional custom key-value data')
          })
        )
        .min(1)
        .describe('Digital interaction events to push')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether events were accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    for (let event of ctx.input.events) {
      await client.postDigitalInteraction({
        eventId: event.eventId,
        eventType: event.eventType,
        timestamp: event.eventTimestamp,
        content: {
          contentId: event.contentId,
          contentTitle: event.contentTitle,
          contentUrl: event.contentUrl
        },
        person: {
          name: event.personName,
          email: event.contactEmail,
          phoneNumber: event.contactPhone
        },
        workspaceId: event.workspaceId,
        customData: event.customData as Record<string, string> | undefined
      });
    }

    return {
      output: { success: true },
      message: `Pushed ${ctx.input.events.length} digital interaction event(s) to Gong.`
    };
  })
  .build();
