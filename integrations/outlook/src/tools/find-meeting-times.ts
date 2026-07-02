import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findMeetingTimes = SlateTool.create(spec, {
  name: 'Find Meeting Times',
  key: 'find_meeting_times',
  description: `Find available meeting time slots based on attendee availability and time constraints. Suggests optimal times when all or most attendees are free. Useful for scheduling meetings with multiple participants.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      attendees: z
        .array(
          z.object({
            email: z.string().describe('Email address of the attendee'),
            name: z.string().optional(),
            type: z.enum(['required', 'optional', 'resource']).default('required')
          })
        )
        .min(1)
        .describe('Attendees to check availability for'),
      timeSlots: z
        .array(
          z.object({
            startDateTime: z.string().describe('Start of available window (ISO 8601)'),
            startTimeZone: z.string().describe('Time zone for start'),
            endDateTime: z.string().describe('End of available window (ISO 8601)'),
            endTimeZone: z.string().describe('Time zone for end')
          })
        )
        .min(1)
        .describe('Time windows to search within'),
      meetingDuration: z
        .string()
        .optional()
        .describe(
          'Duration in ISO 8601 format (e.g., "PT1H" for 1 hour, "PT30M" for 30 minutes)'
        ),
      maxCandidates: z.number().optional().describe('Maximum number of suggestions to return'),
      isOrganizerOptional: z
        .boolean()
        .optional()
        .describe('Whether the organizer is optional'),
      minimumAttendeePercentage: z
        .number()
        .optional()
        .describe('Minimum percentage of attendees that must be available (0-100)')
    })
  )
  .output(
    z.object({
      suggestions: z.array(
        z.object({
          startDateTime: z.string(),
          startTimeZone: z.string(),
          endDateTime: z.string(),
          endTimeZone: z.string(),
          confidence: z.number(),
          organizerAvailability: z.string(),
          attendeeAvailability: z
            .array(
              z.object({
                email: z.string(),
                availability: z.string()
              })
            )
            .optional()
        })
      ),
      emptySuggestionsReason: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.findMeetingTimes({
      attendees: ctx.input.attendees.map(a => ({
        emailAddress: { address: a.email, name: a.name },
        type: a.type
      })),
      timeConstraint: {
        timeslots: ctx.input.timeSlots.map(ts => ({
          start: { dateTime: ts.startDateTime, timeZone: ts.startTimeZone },
          end: { dateTime: ts.endDateTime, timeZone: ts.endTimeZone }
        }))
      },
      meetingDuration: ctx.input.meetingDuration,
      maxCandidates: ctx.input.maxCandidates,
      isOrganizerOptional: ctx.input.isOrganizerOptional,
      minimumAttendeePercentage: ctx.input.minimumAttendeePercentage
    });

    let suggestions = result.meetingTimeSuggestions.map(s => ({
      startDateTime: s.meetingTimeSlot.start.dateTime,
      startTimeZone: s.meetingTimeSlot.start.timeZone,
      endDateTime: s.meetingTimeSlot.end.dateTime,
      endTimeZone: s.meetingTimeSlot.end.timeZone,
      confidence: s.confidence,
      organizerAvailability: s.organizerAvailability,
      attendeeAvailability: s.attendeeAvailability?.map(aa => ({
        email: aa.attendee.emailAddress.address,
        availability: aa.availability
      }))
    }));

    return {
      output: {
        suggestions,
        emptySuggestionsReason: result.emptySuggestionsReason
      },
      message:
        suggestions.length > 0
          ? `Found **${suggestions.length}** meeting time suggestion(s).`
          : `No available times found.${result.emptySuggestionsReason ? ` Reason: ${result.emptySuggestionsReason}` : ''}`
    };
  })
  .build();
