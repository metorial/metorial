import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMeetingTypes = SlateTool.create(spec, {
  name: 'List Meeting Types',
  key: 'list_meeting_types',
  description: `List the user's configured meeting types. Meeting types are reusable scheduling templates that define duration, availability windows, video conferencing provider, location, buffer times, and invitee questions. Each meeting type has its own scheduling link.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      onlyTypes: z
        .boolean()
        .optional()
        .describe('If true, return only the type definitions without full meeting settings')
    })
  )
  .output(
    z.object({
      meetingTypes: z
        .array(
          z.object({
            meetingTypeId: z.string().optional().describe('Meeting type identifier'),
            name: z.string().optional().describe('Display name of the meeting type'),
            duration: z.number().optional().describe('Meeting duration in minutes'),
            type: z.string().optional().describe('Meeting type slug'),
            link: z.string().optional().describe('Scheduling link URL'),
            raw: z.any().optional().describe('Full meeting type object')
          })
        )
        .describe('List of meeting types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.listMeetingTypes({
      onlyTypes: ctx.input.onlyTypes
    });

    let meetingTypes = Array.isArray(data) ? data : data?.meetingTypes || data?.types || [];

    let mapped = meetingTypes.map((mt: any) => ({
      meetingTypeId: mt._id || mt.id || mt.type,
      name: mt.name || mt.title,
      duration: mt.duration || mt.meetingLength,
      type: mt.type,
      link: mt.link || mt.schedulingLink || mt.url,
      raw: mt
    }));

    return {
      output: { meetingTypes: mapped },
      message: `Found **${mapped.length}** meeting type(s).`
    };
  })
  .build();
