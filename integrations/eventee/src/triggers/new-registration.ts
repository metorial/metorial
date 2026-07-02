import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newRegistration = SlateTrigger.create(spec, {
  name: 'New Registration',
  key: 'new_registration',
  description: 'Triggers when a new registration for the event is created.'
})
  .input(
    z.object({
      registrationId: z.number().describe('Unique identifier for the registration'),
      email: z.string().describe('Email address of the registrant'),
      firstName: z.string().describe('First name of the registrant'),
      lastName: z.string().describe('Last name of the registrant'),
      createdAt: z.string().describe('When the registration was created (ISO 8601)')
    })
  )
  .output(
    z.object({
      registrationId: z.number().describe('Unique identifier for the registration'),
      email: z.string().describe('Email address of the registrant'),
      firstName: z.string().describe('First name of the registrant'),
      lastName: z.string().describe('Last name of the registrant'),
      createdAt: z.string().describe('When the registration was created (ISO 8601)')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations = await client.listRegistrations();

      let knownIds: number[] = ctx.state?.knownRegistrationIds ?? [];
      let knownIdSet = new Set(knownIds);

      let newRegistrations = registrations.filter(r => !knownIdSet.has(r.registrationId));

      let updatedKnownIds = registrations.map(r => r.registrationId);

      return {
        inputs: newRegistrations.map(r => ({
          registrationId: r.registrationId,
          email: r.email,
          firstName: r.firstName,
          lastName: r.lastName,
          createdAt: r.createdAt
        })),
        updatedState: {
          knownRegistrationIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'registration.created',
        id: String(ctx.input.registrationId),
        output: {
          registrationId: ctx.input.registrationId,
          email: ctx.input.email,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
