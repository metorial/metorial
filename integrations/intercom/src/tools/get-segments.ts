import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { numberOrUndefined, stringOrUndefined, timestampOrUndefined } from '../lib/output';
import { spec } from '../spec';

export let getSegments = SlateTool.create(spec, {
  name: 'Get Segments',
  key: 'get_segments',
  description: `List workspace segments, retrieve one segment, or list the segments attached to a contact. Segments group contacts by rules configured in Intercom.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      segmentId: z.string().optional().describe('Segment ID to retrieve'),
      contactId: z
        .string()
        .optional()
        .describe('Contact ID whose attached segments should be listed'),
      includeCount: z
        .boolean()
        .optional()
        .describe('Include segment member counts where Intercom supports it')
    })
  )
  .output(
    z.object({
      segment: z
        .object({
          segmentId: z.string().describe('Segment ID'),
          name: z.string().optional().describe('Segment name'),
          personType: z.string().optional().describe('Contact type: contact or user'),
          count: z.number().nullable().optional().describe('Segment member count'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
        .optional()
        .describe('Retrieved segment when segmentId is provided'),
      segments: z
        .array(
          z.object({
            segmentId: z.string().describe('Segment ID'),
            name: z.string().optional().describe('Segment name'),
            personType: z.string().optional().describe('Contact type: contact or user'),
            count: z.number().nullable().optional().describe('Segment member count'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .optional()
        .describe('Segments returned for list operations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    if (ctx.input.segmentId) {
      let result = await client.getSegment(ctx.input.segmentId, {
        includeCount: ctx.input.includeCount
      });
      let segment = mapSegment(result);

      return {
        output: { segment },
        message: `Retrieved segment **${segment.name || segment.segmentId}**`
      };
    }

    if (ctx.input.contactId) {
      let result = await client.listContactSegments(ctx.input.contactId);
      let segments = (result.data || []).map(mapSegment);

      return {
        output: { segments },
        message: `Found **${segments.length}** segments attached to contact **${ctx.input.contactId}**`
      };
    }

    let result = await client.listSegments({ includeCount: ctx.input.includeCount });
    let segments = (result.data || []).map(mapSegment);

    return {
      output: { segments },
      message: `Found **${segments.length}** segments`
    };
  })
  .build();

let mapSegment = (data: any) => ({
  segmentId: String(data.id),
  name: stringOrUndefined(data.name),
  personType: stringOrUndefined(data.person_type),
  count: data.count === null ? null : numberOrUndefined(data.count),
  createdAt: timestampOrUndefined(data.created_at),
  updatedAt: timestampOrUndefined(data.updated_at)
});
