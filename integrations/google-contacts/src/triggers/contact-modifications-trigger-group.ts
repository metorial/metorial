import {
  DEFAULT_PERSON_FIELDS,
  GooglePeopleClient,
  googlePeopleServiceError
} from '@slates/google-people-recipes';
import { triggerGroup } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

// Google may take several minutes to expose writes in list responses. Overlap
// polling windows and let the callback runtime deduplicate by contact version.
export const CONTACT_MODIFICATION_WINDOW_MS = 60 * 60 * 1000;
const personFields = `${DEFAULT_PERSON_FIELDS},metadata`;

export const contactModificationEventSchema = z.object({
  resourceName: z.string().min(1),
  changeType: z.literal('modified'),
  contact: z.object({ resourceName: z.string().min(1) }).loose(),
  eventId: z.string().min(1)
});

const timestampNanoseconds = (value: string) => {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/.exec(value);
  if (!match) return null;
  const milliseconds = Date.parse(`${match[1]}Z`);
  if (!Number.isFinite(milliseconds)) return null;
  return BigInt(milliseconds) * 1_000_000n + BigInt((match[2] ?? '').padEnd(9, '0') || '0');
};

const latestContactUpdateTime = (person: Record<string, any>) => {
  const sources = person.metadata?.sources;
  if (!Array.isArray(sources)) return undefined;
  let latest: { value: string; nanoseconds: bigint } | undefined;
  for (const source of sources) {
    if (source?.type !== 'CONTACT' || typeof source.updateTime !== 'string') continue;
    const nanoseconds = timestampNanoseconds(source.updateTime);
    if (nanoseconds === null) continue;
    if (!latest || nanoseconds > latest.nanoseconds) {
      latest = { value: source.updateTime, nanoseconds };
    }
  }
  return latest?.value;
};

export const contactModifications = triggerGroup(spec, {
  key: 'contact_modifications',
  name: 'Contact Modifications',
  description: 'Detects recently modified contacts through Google People.',
  eventSchema: contactModificationEventSchema
})
  .polling({
    intervalSeconds: 900,
    pollEvents: async ctx => {
      const client = new GooglePeopleClient({ token: ctx.auth.token });
      const cutoff = Date.now() - CONTACT_MODIFICATION_WINDOW_MS;
      const events: Array<{
        payload: z.infer<typeof contactModificationEventSchema>;
        idempotencyKey: string;
      }> = [];
      let pageToken: string | undefined;

      do {
        const page = await client.listContacts({
          pageSize: 1000,
          pageToken,
          personFields,
          sortOrder: 'LAST_MODIFIED_DESCENDING'
        });

        for (const person of page.connections ?? []) {
          const resourceName = person.resourceName;
          const updatedAt = latestContactUpdateTime(person);
          if (
            typeof resourceName !== 'string' ||
            !resourceName ||
            typeof updatedAt !== 'string'
          ) {
            continue;
          }

          const updatedMs = Date.parse(updatedAt);
          if (!Number.isFinite(updatedMs) || updatedMs < cutoff) continue;

          // Full listings do not reveal whether a contact is new or was edited.
          // They also omit deletion tombstones; those require a sync token.
          const eventId = `${resourceName}:${updatedAt}`;
          events.push({
            payload: { resourceName, changeType: 'modified', contact: person, eventId },
            idempotencyKey: eventId
          });
        }

        pageToken = page.nextPageToken;
      } while (pageToken);

      return { events };
    }
  })
  .routingMatchers(async ctx => {
    const profile = await new GooglePeopleClient({ token: ctx.auth.token }).getContact(
      'people/me',
      'names'
    );
    if (typeof profile?.resourceName !== 'string' || !profile.resourceName) {
      throw googlePeopleServiceError(
        'Google did not return an account identity for contact polling.'
      );
    }
    return [{ resourceName: profile.resourceName }];
  })
  .build();
