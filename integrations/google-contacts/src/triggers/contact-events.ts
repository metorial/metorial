import {
  contactOutputSchema,
  formatContact,
  GooglePeopleClient,
  googlePeopleServiceError
} from '@slates/google-people-recipes';
import {
  getUpstreamErrorStatus,
  pruneSeenEntries,
  rememberPageToken,
  SlateTrigger,
  seenEntryKey,
  seenEntrySchema,
  triggerGroup
} from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleContactsActionScopes, googleContactsScopes } from '../scopes';
import { spec } from '../spec';

const CONTACT_SNAPSHOT_WINDOW_MS = 60 * 60 * 1000;
export const CONTACT_SNAPSHOT_MAX_PAGES = 10;
export const CONTACT_SNAPSHOT_RESTART_MAX_PAGES = 30;
const CONTACT_SNAPSHOT_BUDGET_MS = 30_000;
export const CONTACT_SEEN_MAX_ENTRIES = 10_000;
const INVALID_CONTACT_WARNINGS = 10;

const sourceSchema = z.object({
  type: z.literal('CONTACT'),
  id: z.string().min(1),
  updateTime: z.iso.datetime(),
  etag: z.string().optional()
});

export const contactChangedSchema = z.object({
  type: z.literal('contact_changed'),
  accountId: z.string().regex(/^people\/(?!me$)[^/]+$/),
  contact: contactOutputSchema,
  source: sourceSchema
});

type ContactChanged = z.infer<typeof contactChangedSchema>;

const pageSchema = z.object({
  connections: z.array(z.unknown()).optional(),
  nextPageToken: z.string().optional()
});
const personSchema = z.looseObject({
  resourceName: z.string().optional(),
  metadata: z
    .looseObject({
      sources: z.array(z.unknown()).optional(),
      deleted: z.boolean().optional()
    })
    .optional()
});

// `checkpoint`: time through which changes are fully read. Contacts list newest first with no
// time filter, so an unfinished read cannot move it; `scan` tracks that read (start, last page
// token, oldest change). `seen`: reported revisions a later read may return again.
const pollStateSchema = z.object({
  checkpoint: z.iso.datetime(),
  scan: z
    .object({
      startedAt: z.iso.datetime(),
      pageToken: z.string().min(1),
      floor: z.iso.datetime()
    })
    .optional(),
  seen: z.array(seenEntrySchema).optional()
});
type PollState = z.infer<typeof pollStateSchema>;
type Revision = { payload: ContactChanged; idempotencyKey: string; at: number; page: number };
// Only provider identifiers, a timestamp, and field names; never contact details.
type InvalidContact = {
  resourceName?: string;
  sourceId?: string;
  updateTime?: string;
  fields: string[];
};

const revisionKey = (event: ContactChanged) =>
  JSON.stringify([
    event.accountId,
    event.source.id,
    event.source.updateTime,
    event.source.etag ?? null
  ]);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const issueFields = (error: z.ZodError) => [
  ...new Set(error.issues.map(issue => issue.path.join('.')).filter(Boolean))
];

const accountIdentity = async (auth: { token: string; scopes?: readonly string[] }) => {
  if (
    !auth.scopes?.some(
      scope =>
        scope === googleContactsScopes.contacts ||
        scope === googleContactsScopes.contactsReadonly
    )
  ) {
    throw googlePeopleServiceError(
      'Contact events require Google OAuth with contacts or contacts.readonly access. Reconnect if the granted scopes are unavailable; API keys are not supported.'
    );
  }

  const profile = await new Client(auth).getMyProfile('names');
  const identity = contactChangedSchema.shape.accountId.safeParse(profile?.resourceName);
  if (!identity.success) {
    throw googlePeopleServiceError(
      'Google did not return a stable authenticated account identity for contact events.'
    );
  }
  return identity.data;
};

const readState = (state: unknown, now: number, warn: (message: string) => void) => {
  if (state === null || state === undefined) return { checkpoint: now, seen: [] };
  const saved = pollStateSchema.safeParse(state);
  if (!saved.success) {
    warn(
      'contact_checkpoint_invalid: The saved contact checkpoint is unreadable. Starting again from the past hour.'
    );
    return { checkpoint: now, seen: [] };
  }
  const checkpoint = Date.parse(saved.data.checkpoint);
  if (checkpoint > now) {
    warn(
      'contact_checkpoint_in_future: The saved contact checkpoint is ahead of the current time and was reset to now.'
    );
  }
  const scan = saved.data.scan;
  return {
    checkpoint: Math.min(checkpoint, now),
    seen: saved.data.seen ?? [],
    scan: scan && {
      startedAt: Math.min(Date.parse(scan.startedAt), now),
      pageToken: scan.pageToken,
      floor: Date.parse(scan.floor)
    }
  };
};

const pageTokenRefused = (error: unknown) =>
  [400, 410].includes(getUpstreamErrorStatus(error) ?? 0);

// Reads newest-first pages until one is older than `cutoff`. A resumed read rereads its last
// page and is `disconnected` unless it still reaches the oldest change read.
const readRevisions = async (d: {
  client: GooglePeopleClient;
  accountId: string;
  cutoff: number;
  maxPages: number;
  budgetMs?: number;
  resume?: { pageToken: string; floor: number };
}) => {
  const started = Date.now();
  const events = new Map<string, Revision>();
  const invalid: InvalidContact[] = [];
  const seenTokens = new Set<string>(d.resume ? [d.resume.pageToken] : []);
  let pageToken = d.resume?.pageToken;
  let floor = d.resume?.floor ?? Number.POSITIVE_INFINITY;
  let missingMetadata = 0;
  let page = 1;
  const finish = (status: 'complete' | 'partial' | 'disconnected', resumeToken?: string) => ({
    status,
    events: [...events.values()],
    invalid,
    missingMetadata,
    floor,
    page,
    pageToken: resumeToken
  });

  for (; ; page += 1) {
    let response: unknown;
    try {
      response = await d.client.listContactRevisions(pageToken);
    } catch (error) {
      if (d.resume && page === 1 && pageTokenRefused(error)) return finish('disconnected');
      throw error;
    }
    const result = pageSchema.safeParse(response);
    if (!result.success) {
      throw googlePeopleServiceError(
        'contact_snapshot_page_invalid: Google returned an invalid contact listing. No partial snapshot was delivered.'
      );
    }
    const contacts = result.data.connections ?? [];
    const nextPageToken = result.data.nextPageToken;
    let entirelyBeforeWindow = contacts.length > 0;
    let newest = Number.NEGATIVE_INFINITY;

    for (const item of contacts) {
      const parsedPerson = personSchema.safeParse(item);
      if (!parsedPerson.success) {
        const resourceName = isRecord(item) ? item.resourceName : undefined;
        invalid.push({
          resourceName: typeof resourceName === 'string' ? resourceName : undefined,
          fields: issueFields(parsedPerson.error)
        });
        entirelyBeforeWindow = false;
        continue;
      }
      const person = parsedPerson.data;
      const sources = (person.metadata?.sources ?? []).filter(
        source => isRecord(source) && source.type === 'CONTACT'
      );
      if (!sources.length) {
        missingMetadata += 1;
        entirelyBeforeWindow = false;
      }
      let changedAt = Number.NEGATIVE_INFINITY;
      for (const candidate of sources) {
        const parsedSource = sourceSchema.safeParse(candidate);
        if (!parsedSource.success) {
          missingMetadata += 1;
          entirelyBeforeWindow = false;
          continue;
        }
        const source = parsedSource.data;
        const updatedAt = Date.parse(source.updateTime);
        changedAt = Math.max(changedAt, updatedAt);
        if (updatedAt < d.cutoff) continue;
        entirelyBeforeWindow = false;
        if (person.metadata?.deleted) continue;

        // One contact Google returns in an unexpected form must not stop the others.
        let contact: ReturnType<typeof contactOutputSchema.safeParse> | undefined;
        try {
          contact = contactOutputSchema.safeParse(formatContact(person));
        } catch {
          contact = undefined;
        }
        if (!contact?.success) {
          invalid.push({
            resourceName: person.resourceName,
            sourceId: source.id,
            updateTime: source.updateTime,
            fields: contact ? issueFields(contact.error) : []
          });
          continue;
        }
        const payload: ContactChanged = {
          type: 'contact_changed',
          accountId: d.accountId,
          contact: contact.data,
          source
        };
        const idempotencyKey = revisionKey(payload);
        events.set(idempotencyKey, { payload, idempotencyKey, at: updatedAt, page });
      }
      if (Number.isFinite(changedAt)) {
        newest = Math.max(newest, changedAt);
        floor = Math.min(floor, changedAt);
      }
    }

    if (d.resume && page === 1 && !(newest >= d.resume.floor)) return finish('disconnected');

    // CONTACT-only results are ordered by last modification; finish the page before stopping.
    // https://developers.google.com/people/api/rest/v1/people.connections/list#SortOrder
    if (!nextPageToken || entirelyBeforeWindow) return finish('complete');
    if (!rememberPageToken(seenTokens, nextPageToken)) {
      if (d.resume) return finish('disconnected');
      throw googlePeopleServiceError(
        'contact_snapshot_paging_repeated: Google repeated a contact page token. No partial snapshot was delivered.'
      );
    }
    // Resume from the page just read, so the next read can prove it joins this one.
    const overBudget =
      page >= d.maxPages || (d.budgetMs !== undefined && Date.now() - started >= d.budgetMs);
    if (overBudget && pageToken && page >= 2) return finish('partial', pageToken);
    pageToken = nextPageToken;
  }
};

export const contactEvents = triggerGroup(spec, {
  key: 'contact_events',
  name: 'Contact Events',
  description: 'Snapshots of contacts changed since the previous check, every 15 minutes.',
  eventSchema: contactChangedSchema
})
  .polling({
    intervalSeconds: 900,
    pollEvents: async ctx => {
      const accountId = await accountIdentity(ctx.auth);
      const client = new GooglePeopleClient(ctx.auth);
      const now = Date.now();
      const iso = (time: number) => new Date(time).toISOString();
      const saved = readState(ctx.input.state, now, message => ctx.warn({ message }));
      const cutoff = saved.checkpoint - CONTACT_SNAPSHOT_WINDOW_MS;
      const reported = new Map(
        saved.seen.filter(entry => entry.at >= cutoff).map(entry => [entry.key, entry.at])
      );

      let startedAt = saved.scan?.startedAt ?? now;
      let read = await readRevisions({
        client,
        accountId,
        cutoff,
        maxPages: CONTACT_SNAPSHOT_MAX_PAGES,
        budgetMs: CONTACT_SNAPSHOT_BUDGET_MS,
        resume: saved.scan
      });
      let revisions = read.events;
      // A continued read that ends without reaching anything older made no progress.
      const restarted =
        read.status === 'disconnected' ||
        (saved.scan !== undefined &&
          read.status === 'partial' &&
          !(read.floor < saved.scan.floor));
      if (restarted) {
        startedAt = now;
        const continued = read.events;
        read = await readRevisions({
          client,
          accountId,
          cutoff,
          maxPages: CONTACT_SNAPSHOT_RESTART_MAX_PAGES
        });
        const reread = new Set(read.events.map(event => event.idempotencyKey));
        revisions = [
          ...read.events,
          ...continued.filter(event => !reread.has(event.idempotencyKey))
        ];
      }
      const unreported = revisions.filter(
        revision => !reported.has(seenEntryKey(revision.idempotencyKey))
      );
      const events = unreported.map(({ payload, idempotencyKey }) => ({
        payload,
        idempotencyKey
      }));

      if (read.missingMetadata) {
        ctx.warn({
          message: `contact_revision_metadata_missing: Skipped ${read.missingMetadata} contact sources without usable revision metadata.`
        });
      }
      for (const contact of read.invalid.slice(0, INVALID_CONTACT_WARNINGS)) {
        ctx.warn({
          message:
            'contact_snapshot_invalid: Skipped a contact that Google returned in an unexpected form. Other contacts were read.',
          ...contact
        });
      }
      if (read.invalid.length > INVALID_CONTACT_WARNINGS) {
        ctx.warn({
          message: `contact_snapshot_invalid: Skipped ${read.invalid.length} contacts that Google returned in an unexpected form; only the first ${INVALID_CONTACT_WARNINGS} are listed.`
        });
      }

      // The next read starts one window before the checkpoint; a continued read keeps all it reported.
      const continuing =
        read.status === 'partial' && read.pageToken !== undefined && !restarted;
      const nextCutoff = startedAt - CONTACT_SNAPSHOT_WINDOW_MS;
      const seen = pruneSeenEntries(
        [
          ...[...reported].map(([key, at]) => ({ key, at, retain: continuing })),
          ...unreported.map(revision => ({
            key: seenEntryKey(revision.idempotencyKey),
            at: revision.at,
            retain: continuing && revision.page === read.page
          }))
        ],
        {
          cutoff: nextCutoff,
          maxEntries: CONTACT_SEEN_MAX_ENTRIES,
          onOverflow: dropped =>
            ctx.warn({
              message: `contact_seen_overflow: More than ${CONTACT_SEEN_MAX_ENTRIES} recent contact revisions would have to be remembered. The oldest ${dropped} can be reported again.`
            })
        }
      );

      if (continuing && read.pageToken) {
        ctx.warn({
          message: `contact_snapshot_backlog: More contacts changed than one check reads (${CONTACT_SNAPSHOT_MAX_PAGES} pages of 1000, or ${CONTACT_SNAPSHOT_BUDGET_MS / 1000} seconds). The remaining older changes are read on the next check.`
        });
        const updatedState: PollState = {
          checkpoint: iso(saved.checkpoint),
          scan: {
            startedAt: iso(startedAt),
            pageToken: read.pageToken,
            floor: iso(Number.isFinite(read.floor) ? read.floor : startedAt)
          },
          seen
        };
        return { events, updatedState };
      }
      if (read.status === 'partial') {
        ctx.warn({
          message: `contact_snapshot_backlog_truncated: The earlier read could not be continued and ${CONTACT_SNAPSHOT_RESTART_MAX_PAGES} pages of 1000 did not reach the previous check. Changes older than ${Number.isFinite(read.floor) ? iso(read.floor) : 'the pages read'} may not have been delivered.`
        });
      }
      const updatedState: PollState = { checkpoint: iso(startedAt), seen };
      return { events, updatedState };
    }
  })
  .routingMatchers(async ctx => [{ accountId: await accountIdentity(ctx.auth) }])
  .build();

export const contactChanged = SlateTrigger.create(spec, {
  key: 'contact_changed',
  name: 'Contact Changed',
  description:
    'Emits a contact snapshot when its contact-source revision is observed, including newly created contacts. Changes from the hour before activation can appear, and after an interruption checking resumes where it stopped. Does not distinguish creation from edits or report deletions.'
})
  .triggerGroup(contactEvents)
  .authMethods(['google_oauth'])
  .scopes(googleContactsActionScopes.listContacts)
  .input(contactChangedSchema)
  .output(contactChangedSchema)
  .matches(input => contactChangedSchema.safeParse(input).success)
  .map(async ctx => ({
    type: 'contact_changed',
    id: revisionKey(ctx.input),
    output: ctx.input
  }))
  .build();
