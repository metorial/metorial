import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let personChanges = SlateTrigger.create(spec, {
  name: 'Person Changes',
  key: 'person_changes',
  description: 'Triggers when a person (contact) is created or updated in Pipeline CRM.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of change detected'),
      personId: z.number().describe('ID of the affected person'),
      person: z.any().describe('Full person record from the API')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('Unique person ID'),
      firstName: z.string().nullable().optional().describe('First name'),
      lastName: z.string().nullable().optional().describe('Last name'),
      email: z.string().nullable().optional().describe('Email address'),
      phone: z.string().nullable().optional().describe('Phone number'),
      title: z.string().nullable().optional().describe('Job title'),
      type: z.string().nullable().optional().describe('Person type'),
      companyName: z.string().nullable().optional().describe('Associated company name'),
      userId: z.number().nullable().optional().describe('Owner user ID'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        appKey: ctx.auth.appKey
      });

      let lastPolledAt = (ctx.state as any)?.lastPolledAt as string | undefined;

      let result = await client.listPeople({
        page: 1,
        perPage: 200,
        sort: 'updated_at'
      });

      let entries = result.entries ?? [];

      let newEntries = lastPolledAt
        ? entries.filter(
            (person: any) => person.updated_at && person.updated_at > lastPolledAt
          )
        : entries;

      let inputs = newEntries.map((person: any) => {
        let isNew = !lastPolledAt || (person.created_at && person.created_at > lastPolledAt);
        return {
          eventType: isNew ? ('created' as const) : ('updated' as const),
          personId: person.id,
          person
        };
      });

      let latestTimestamp =
        entries.length > 0
          ? entries.reduce(
              (max: string, p: any) => (p.updated_at > max ? p.updated_at : max),
              entries[0]!.updated_at
            )
          : lastPolledAt;

      return {
        inputs,
        updatedState: {
          lastPolledAt: latestTimestamp ?? lastPolledAt
        }
      };
    },

    handleEvent: async ctx => {
      let person = ctx.input.person;

      return {
        type: `person.${ctx.input.eventType}`,
        id: `person-${ctx.input.personId}-${person.updated_at ?? Date.now()}`,
        output: {
          personId: person.id,
          firstName: person.first_name ?? null,
          lastName: person.last_name ?? null,
          email: person.email ?? null,
          phone: person.phone ?? null,
          title: person.title ?? null,
          type: person.type ?? null,
          companyName: person.company?.name ?? null,
          userId: person.user_id ?? person.owner_id ?? null,
          createdAt: person.created_at ?? null,
          updatedAt: person.updated_at ?? null
        }
      };
    }
  })
  .build();
