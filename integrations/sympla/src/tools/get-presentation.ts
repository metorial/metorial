import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPresentationTool = SlateTool.create(spec, {
  name: 'Get Event Presentation',
  key: 'get_presentation',
  description:
    'Get the provider details for one event presentation or session. Use list_current_events to discover the event ID hash and list_presentations to discover the numeric presentation ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      eventIdHash: z.string().describe('String event ID hash from list_current_events'),
      presentationId: z.number().describe('Numeric presentation ID from list_presentations'),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone. Provider default: America/Sao_Paulo.')
    })
  )
  .output(
    z.object({
      presentation: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Unmodified provider presentation; absent for HTTP 204'),
      httpStatus: z.number().describe('Actual HTTP response status; 204 means no content')
    })
  )
  .handleInvocation(async ctx => {
    let response = await new Client(ctx.auth.token).getPresentation(
      ctx.input.eventIdHash,
      ctx.input.presentationId,
      ctx.input.timezone
    );
    return {
      output: {
        presentation: response.status === 204 ? undefined : response.data,
        httpStatus: response.status
      },
      message:
        response.status === 204 ? 'Sympla returned no content.' : 'Retrieved presentation.'
    };
  })
  .build();
