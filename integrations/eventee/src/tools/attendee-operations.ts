import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, mapPerson, requireWholeNumber } from '../lib/client';
import { attendeeInputSchema, providerRecordSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createRegistrations = SlateTool.create(spec, {
  name: 'Create Registrations',
  key: 'create_registrations',
  description:
    'Pre-register people by email, updating existing registrations with the same email. Set sendEmail to notify them. Eventee processes the first 25 immediately and the rest in the background; invalid entries may be skipped. Call list_registrations to verify results.',
  tags: { destructive: false }
})
  .input(
    z.object({ registrations: z.array(attendeeInputSchema.omit({ tickets: true })).min(1) })
  )
  .output(z.object({ submittedCount: z.number(), raw: providerRecordSchema }))
  .handleInvocation(async ctx => {
    let raw = await new Client({ token: ctx.auth.token }).request(
      'PUT',
      '/registration/invite',
      {
        registrations: ctx.input.registrations.map(mapPerson)
      }
    );
    let parsed = providerRecordSchema.safeParse(raw);
    if (!parsed.success)
      throw createApiServiceError('Eventee returned an unexpected registration response.');
    return {
      output: { submittedCount: ctx.input.registrations.length, raw: parsed.data },
      message: `Submitted ${ctx.input.registrations.length} registration(s). Call list_registrations to verify.`
    };
  })
  .build();

export let setAttendeeCheckin = SlateTool.create(spec, {
  name: 'Set Attendee Check-in',
  key: 'set_attendee_checkin',
  description:
    'Check an attendee in or undo their event check-in. Call list_participants to discover the participant ID.',
  tags: { destructive: false }
})
  .input(
    z.object({
      participantId: z.number().describe('Participant ID from list_participants'),
      checkin: z.boolean().describe('true to check in, false to undo check-in')
    })
  )
  .output(z.object({ attendee: providerRecordSchema }))
  .handleInvocation(async ctx => {
    requireWholeNumber(ctx.input.participantId, 'participantId');
    let result = await new Client({ token: ctx.auth.token }).request(
      'PATCH',
      `/attendee/${ctx.input.participantId}/checkin`,
      { checkin: ctx.input.checkin }
    );
    let parsed = providerRecordSchema.safeParse(result);
    if (!parsed.success)
      throw createApiServiceError('Eventee returned an unexpected attendee response.');
    return {
      output: { attendee: parsed.data },
      message: 'Updated the attendee check-in status.'
    };
  })
  .build();

export let removeAttendee = SlateTool.create(spec, {
  name: 'Remove Attendee',
  key: 'remove_attendee',
  description:
    'Remove an attendee from this event, including participation, invitation and tickets. The Eventee account remains. Call list_participants to discover attendee emails. Also succeeds when the attendee is already absent.',
  tags: { destructive: true }
})
  .input(
    z.object({
      email: z.string().email().describe('Plain email address; do not URL-encode it')
    })
  )
  .output(z.object({ removed: z.boolean() }))
  .handleInvocation(async ctx => {
    await new Client({ token: ctx.auth.token }).request('DELETE', '/attendee', undefined, {
      email: ctx.input.email
    });
    return { output: { removed: true }, message: 'The attendee is absent from the event.' };
  })
  .build();

export let removeRegistration = SlateTool.create(spec, {
  name: 'Remove Registration',
  key: 'remove_registration',
  description:
    'Remove an event registration by email. Call list_registrations to discover registration emails. Also succeeds when the registration is already absent.',
  tags: { destructive: true }
})
  .input(
    z.object({
      email: z.string().email().describe('Plain email address; do not URL-encode it')
    })
  )
  .output(z.object({ removed: z.boolean() }))
  .handleInvocation(async ctx => {
    await new Client({ token: ctx.auth.token }).request('DELETE', '/registration', undefined, {
      email: ctx.input.email
    });
    return {
      output: { removed: true },
      message: 'The registration is absent from the event.'
    };
  })
  .build();
