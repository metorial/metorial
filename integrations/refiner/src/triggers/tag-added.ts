import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let tagAdded = SlateTrigger.create(spec, {
  name: 'Tag Added',
  key: 'tag_added',
  description:
    'Triggers when a tag is added to a survey response. Useful for routing tagged responses to external systems for follow-up actions.'
})
  .input(
    z.object({
      triggeredEvent: z.string().describe('The event that triggered the webhook'),
      payload: z.record(z.string(), z.unknown()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      contactUuid: z.string().describe('Refiner UUID of the contact'),
      projectUuid: z.string().describe('UUID of the Refiner project'),
      remoteId: z.string().nullable().describe('External user ID'),
      email: z.string().nullable().describe('Email of the contact'),
      attributes: z.record(z.string(), z.unknown()).describe('Contact attributes and traits'),
      segments: z
        .array(
          z.object({
            segmentUuid: z.string().describe('UUID of the segment'),
            name: z.string().describe('Name of the segment')
          })
        )
        .describe('Segments the contact belongs to'),
      surveyUuid: z.string().nullable().describe('UUID of the survey'),
      surveyName: z.string().nullable().describe('Name of the survey'),
      responseUuid: z.string().nullable().describe('UUID of the survey response'),
      responseData: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Survey response data'),
      tags: z.array(z.string()).describe('Tags on the response')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let triggeredEvent = data.triggered_event ?? '';

      if (triggeredEvent !== 'Tag added' && triggeredEvent !== 'Tag Added') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            triggeredEvent,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.payload as any;

      let responseUuid = data.response?.uuid ?? '';
      let eventId = `tag_added-${responseUuid}-${Date.now()}`;

      return {
        type: 'response.tag_added',
        id: eventId,
        output: {
          contactUuid: data.uuid ?? '',
          projectUuid: data.project_uuid ?? '',
          remoteId: data.remote_id ?? null,
          email: data.email ?? null,
          attributes: data.attributes ?? {},
          segments: (data.segments || []).map((s: any) => ({
            segmentUuid: s.uuid,
            name: s.name
          })),
          surveyUuid: data.form?.uuid ?? null,
          surveyName: data.form?.name ?? null,
          responseUuid: data.response?.uuid ?? null,
          responseData: data.response?.data ?? null,
          tags: data.response?.tags ?? []
        }
      };
    }
  })
  .build();
