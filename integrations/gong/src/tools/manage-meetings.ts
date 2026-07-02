import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { gongServiceError } from '../lib/errors';
import { spec } from '../spec';

let meetingInviteeSchema = z.object({
  email: z.string().describe('Invitee email address'),
  displayName: z.string().optional().describe('Invitee display name'),
  firstName: z.string().optional().describe('Invitee first name'),
  lastName: z.string().optional().describe('Invitee last name')
});

let inviteeInputSchema = z.union([z.string(), meetingInviteeSchema]);

let normalizeInvitees = (
  invitees: Array<string | z.infer<typeof meetingInviteeSchema>> | undefined,
  attendees:
    | Array<{
        email: string;
        name?: string;
      }>
    | undefined
) => {
  let source = invitees && invitees.length > 0 ? invitees : attendees;

  return source?.map(invitee => {
    if (typeof invitee === 'string') return { email: invitee };

    return {
      email: invitee.email,
      displayName:
        'displayName' in invitee
          ? invitee.displayName
          : 'name' in invitee
            ? invitee.name
            : undefined,
      firstName: 'firstName' in invitee ? invitee.firstName : undefined,
      lastName: 'lastName' in invitee ? invitee.lastName : undefined
    };
  });
};

export let createMeeting = SlateTool.create(spec, {
  name: 'Create Meeting',
  key: 'create_meeting',
  description: `Create a new meeting in Gong. Define the meeting title, schedule, organizer, and attendees. The meeting will appear in Gong's meeting tracking.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().optional().describe('Meeting title'),
      startTime: z.string().optional().describe('Meeting start in ISO 8601 format'),
      endTime: z.string().optional().describe('Meeting end in ISO 8601 format'),
      scheduledStartTime: z.string().optional().describe('Deprecated alias for startTime'),
      scheduledEndTime: z.string().optional().describe('Deprecated alias for endTime'),
      organizerEmail: z.string().describe('Email of the meeting organizer'),
      attendees: z
        .array(
          z.object({
            email: z.string().describe('Attendee email'),
            name: z.string().optional().describe('Attendee name')
          })
        )
        .min(1)
        .optional()
        .describe('Deprecated alias for invitees'),
      invitees: z
        .array(inviteeInputSchema)
        .min(1)
        .optional()
        .describe(
          'Invitees excluding the organizer. Strings are accepted as email-only invitees.'
        ),
      externalId: z.string().optional().describe('ID of this meeting in the external system')
    })
  )
  .output(
    z.object({
      meetingId: z.string().optional().describe('ID of the created meeting'),
      meetingUrl: z.string().optional().describe('URL to join the Gong meeting'),
      additionalInvitees: z
        .array(z.any())
        .optional()
        .describe('Additional invitees added by Gong')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let startTime = ctx.input.startTime || ctx.input.scheduledStartTime;
    let endTime = ctx.input.endTime || ctx.input.scheduledEndTime;
    let invitees = normalizeInvitees(ctx.input.invitees, ctx.input.attendees);

    if (!startTime) {
      throw gongServiceError('startTime is required to create a Gong meeting.');
    }

    if (!endTime) {
      throw gongServiceError('endTime is required to create a Gong meeting.');
    }

    if (!invitees || invitees.length === 0) {
      throw gongServiceError('invitees is required to create a Gong meeting.');
    }

    let result = await client.createMeeting({
      title: ctx.input.title,
      startTime,
      endTime,
      organizerEmail: ctx.input.organizerEmail,
      invitees,
      externalId: ctx.input.externalId
    });

    return {
      output: {
        meetingId: result.meetingId || result.id,
        meetingUrl: result.meetingUrl,
        additionalInvitees: result.additionalInvitees
      },
      message: `Created meeting${ctx.input.title ? ` **${ctx.input.title}**` : ''}.`
    };
  })
  .build();

export let updateMeeting = SlateTool.create(spec, {
  name: 'Update Meeting',
  key: 'update_meeting',
  description: `Update an existing Gong meeting's time, title, organizer, invitees, or external ID.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      meetingId: z.string().describe('Gong meeting ID to update'),
      title: z.string().optional().describe('Meeting title'),
      startTime: z.string().describe('Meeting start in ISO 8601 format'),
      endTime: z.string().describe('Meeting end in ISO 8601 format'),
      organizerEmail: z.string().describe('Email of the meeting organizer'),
      invitees: z
        .array(inviteeInputSchema)
        .min(1)
        .describe(
          'Invitees excluding the organizer. Strings are accepted as email-only invitees.'
        ),
      externalId: z.string().optional().describe('ID of this meeting in the external system')
    })
  )
  .output(
    z.object({
      meetingId: z.string().optional().describe('ID of the updated meeting'),
      requestId: z.string().optional().describe('Gong request ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let invitees = normalizeInvitees(ctx.input.invitees, undefined);

    if (!invitees || invitees.length === 0) {
      throw gongServiceError('invitees is required to update a Gong meeting.');
    }

    let result = await client.updateMeeting(ctx.input.meetingId, {
      title: ctx.input.title,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      organizerEmail: ctx.input.organizerEmail,
      invitees,
      externalId: ctx.input.externalId
    });

    return {
      output: {
        meetingId: result.meetingId || ctx.input.meetingId,
        requestId: result.requestId
      },
      message: `Updated meeting **${ctx.input.meetingId}**.`
    };
  })
  .build();

export let deleteMeeting = SlateTool.create(spec, {
  name: 'Delete Meeting',
  key: 'delete_meeting',
  description: `Delete a meeting from Gong by its ID. This permanently removes the meeting record.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      meetingId: z.string().describe('ID of the meeting to delete'),
      organizerEmail: z.string().describe('Email of the meeting organizer')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    await client.deleteMeeting(ctx.input.meetingId, ctx.input.organizerEmail);

    return {
      output: {
        success: true
      },
      message: `Deleted meeting **${ctx.input.meetingId}**.`
    };
  })
  .build();
