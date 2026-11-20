import {
  createApiServiceError,
  getUpstreamErrorStatus,
  parseWithServiceError,
  rememberPageToken
} from 'slates';
import {
  type Client,
  extractAttachments,
  extractHeader,
  type GmailHistoryPage,
  type GmailMessage,
  type MessagePart
} from '../lib/client';
import {
  type EmailReceived,
  emailReceivedSchema,
  historyIdSchema,
  type MailboxRegistration,
  type MailboxState,
  mailboxStateSchema
} from './event-schemas';

export const GMAIL_SYNC_MAX_PAGES = 100;
export const GMAIL_SYNC_MAX_MESSAGES = 200;
export const GMAIL_SEEN_MAX_ENTRIES = 10_000;
const GMAIL_RECOVERY_WINDOW_MS = 24 * 60 * 60 * 1000;
const overlapMs = 5 * 60 * 1000;
type Recovery = NonNullable<MailboxState['lastRecovery']>;
const fail = (message: string): never => {
  throw createApiServiceError(message);
};
const rejectsSavedPage = (error: unknown) => {
  const code = getUpstreamErrorStatus(error) ?? 0;
  return code >= 400 && code < 500 && code !== 401 && code !== 403 && code !== 429;
};
const newestSeen = (seen: Record<string, number>) => {
  const entries = Object.entries(seen);
  if (entries.length <= GMAIL_SEEN_MAX_ENTRIES) return seen;
  return Object.fromEntries(
    entries.sort(([, a], [, b]) => a - b).slice(-GMAIL_SEEN_MAX_ENTRIES)
  );
};

const addresses = (value: string): string[] =>
  value.toLowerCase().match(/[^\s<>(),;:"]+@[^\s<>(),;:"]+/g) ?? [];
const received = (message: GmailMessage, mailbox: string) => {
  const labels = new Set(message.labelIds ?? []);
  if (['DRAFT', 'SPAM', 'TRASH', 'CHAT'].some(label => labels.has(label))) return false;
  if (!labels.has('SENT') || labels.has('INBOX')) return true;
  // Sent mail that skipped the inbox is incoming only when self-addressed.
  return ['To', 'Cc', 'Bcc', 'Delivered-To'].some(name =>
    addresses(extractHeader(message, name) ?? '').includes(mailbox)
  );
};

const event = (
  message: GmailMessage,
  saved: MailboxRegistration,
  observedAt: string,
  source: 'history' | 'recovery'
): EmailReceived | null => {
  if (!received(message, saved.mailbox)) return null;
  const date = Number(message.internalDate);
  if (
    !/^\d+$/.test(message.internalDate) ||
    !Number.isSafeInteger(date) ||
    !Number.isFinite(new Date(date).getTime())
  )
    return fail('Gmail returned an invalid message internal date.');
  const attachments: EmailReceived['attachments'] = extractAttachments(message.payload);
  // Small parts can carry inline data without an attachmentId; expose only their metadata.
  const collectInlineMetadata = (part: MessagePart) => {
    if (part.filename && !part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body?.size ?? 0
      });
    }
    for (const child of part.parts ?? []) collectInlineMetadata(child);
  };
  if (message.payload) collectInlineMetadata(message.payload);
  return parseWithServiceError(
    emailReceivedSchema,
    {
      kind: 'email_received',
      eventId: `${saved.accountId}:${message.id}`,
      accountId: saved.accountId,
      mailbox: saved.mailbox,
      messageId: message.id,
      threadId: message.threadId,
      labelIds: message.labelIds ?? [],
      from: extractHeader(message, 'From') ?? '',
      to: extractHeader(message, 'To') ?? '',
      cc: extractHeader(message, 'Cc') ?? '',
      bcc: extractHeader(message, 'Bcc') ?? '',
      subject: extractHeader(message, 'Subject') ?? '',
      snippet: message.snippet ?? '',
      internalDate: message.internalDate,
      messageTime: new Date(date).toISOString(),
      observedAt,
      source,
      hasAttachments: attachments.length > 0,
      attachments
    },
    'Gmail returned an invalid received message.'
  );
};

export const syncMailbox = async (
  client: Client,
  saved: MailboxRegistration,
  rawState: unknown
) => {
  const now = Date.now();
  const observedAt = new Date(now).toISOString();
  const state: MailboxState =
    rawState == null
      ? {
          version: 1,
          accountId: saved.accountId,
          mailbox: saved.mailbox,
          historyId: saved.initialHistoryId,
          checkedAt: saved.activatedAt,
          seen: {}
        }
      : parseWithServiceError(
          mailboxStateSchema,
          rawState,
          'The saved Gmail synchronization state is invalid.'
        );
  if (state.accountId !== saved.accountId || state.mailbox !== saved.mailbox)
    return fail('The Gmail synchronization state belongs to a different mailbox.');
  if (Date.parse(state.checkedAt) > now || Date.parse(saved.activatedAt) > now)
    return fail('The Gmail synchronization checkpoint is in the future.');
  const seen: Record<string, number> = Object.fromEntries(
    Object.entries(state.seen).filter(
      ([, time]) => time >= now - GMAIL_RECOVERY_WINDOW_MS - overlapMs
    )
  );
  const events: Array<{ payload: EmailReceived; idempotencyKey: string }> = [];
  let budget = GMAIL_SYNC_MAX_MESSAGES;
  let progressed = false;
  let remembered = 0;
  // On upstream failure return the checkpointed work, or rethrow when there is none.
  const halt = (error: unknown) => {
    if (!progressed) throw error;
    budget = 0;
  };

  // False tells the caller to stop without moving its checkpoint past this message.
  const take = async (id: string, source: EmailReceived['source'], since?: number) => {
    if (Object.hasOwn(seen, id)) return true;
    if (budget === 0) return false;
    budget--;
    let message: GmailMessage;
    try {
      message = await client.getMessage(id, 'full');
    } catch (error) {
      if (getUpstreamErrorStatus(error) === 404) return true;
      halt(error);
      return false;
    }
    if (message.id !== id) return fail('Gmail returned a message with the wrong identity.');
    if (since !== undefined && Number(message.internalDate) < since) return true;
    const payload = event(message, saved, observedAt, source);
    seen[id] = now;
    remembered++;
    progressed = true;
    if (payload) events.push({ payload, idempotencyKey: payload.eventId });
    return true;
  };

  const drainHistory = async (
    start: string,
    savedPage?: string
  ): Promise<{ cursor: string; pageToken?: string; complete: boolean }> => {
    const pages = new Set<string>();
    let cursor = start;
    let pageToken = savedPage;
    let rewound = false;
    // Resume after the last finished record, or else at the page this listing reached.
    const stop = () =>
      cursor === start && pageToken
        ? { cursor, pageToken, complete: false }
        : { cursor, complete: false };
    for (let page = 0; page < GMAIL_SYNC_MAX_PAGES; page++) {
      let response: GmailHistoryPage;
      try {
        response = await client.listHistory(start, pageToken);
      } catch (error) {
        // A 404 means the cursor expired; any other rejected page is re-read from the cursor.
        if (
          page === 0 &&
          pageToken &&
          getUpstreamErrorStatus(error) !== 404 &&
          rejectsSavedPage(error)
        ) {
          pageToken = undefined;
          rewound = true;
          continue;
        }
        halt(error);
        return stop();
      }
      const head = parseWithServiceError(
        historyIdSchema,
        response.historyId,
        'Gmail returned an invalid history checkpoint.'
      );
      if (BigInt(head) < BigInt(start))
        return fail('Gmail returned a history checkpoint older than the saved cursor.');
      for (const record of response.history ?? []) {
        const recordId = parseWithServiceError(
          historyIdSchema,
          record.id,
          'Gmail returned an invalid history record.'
        );
        if (BigInt(recordId) < BigInt(cursor))
          return fail('Gmail returned history out of order; the checkpoint was not advanced.');
        for (const added of record.messagesAdded ?? []) {
          if (!added.message?.id)
            return fail('Gmail returned an invalid added-message history entry.');
          if (!(await take(added.message.id, 'history'))) return stop();
        }
        cursor = recordId;
        progressed = true;
      }
      if (!response.nextPageToken) return { cursor: head, complete: true };
      if (!rememberPageToken(pages, response.nextPageToken))
        return fail('Gmail repeated a history page token; the checkpoint was not advanced.');
      pageToken = response.nextPageToken;
    }
    if (rewound && cursor === start)
      return fail('Gmail history exceeded the page budget; the checkpoint was not advanced.');
    progressed = true;
    return stop();
  };

  const searchRecent = async (recovery: Recovery): Promise<Recovery> => {
    const { pending: position, ...summary } = recovery;
    const handled = position?.handled ?? 0;
    const since = Date.parse(summary.since);
    const resumeAt = (pageToken?: string): Recovery => ({
      ...summary,
      pending: { handled, ...(pageToken ? { pageToken } : {}) }
    });
    const pages = new Set<string>();
    let pageToken = position?.pageToken;
    for (let page = 0; page < GMAIL_SYNC_MAX_PAGES; page++) {
      let response: Awaited<ReturnType<Client['listMessages']>>;
      try {
        response = await client.listMessages({
          query: `after:${Math.floor(since / 1000) - 1}`,
          maxResults: 500,
          includeSpamTrash: false,
          pageToken
        });
      } catch (error) {
        if (page === 0 && pageToken && rejectsSavedPage(error)) {
          // Page tokens have no documented lifetime. Restarting converges only while `seen` holds
          // every message this recovery handled; past that the rest is given up.
          if (
            handled > GMAIL_SEEN_MAX_ENTRIES ||
            now - Date.parse(summary.observedAt) > GMAIL_RECOVERY_WINDOW_MS
          )
            return { ...summary, incomplete: true };
          pageToken = undefined;
          continue;
        }
        halt(error);
        return resumeAt(pageToken);
      }
      for (const listed of response.messages) {
        if (!listed.id) return fail('Gmail returned an invalid recovery message identity.');
        if (!(await take(listed.id, 'recovery', since))) return resumeAt(pageToken);
      }
      if (!response.nextPageToken) return summary;
      if (!rememberPageToken(pages, response.nextPageToken))
        return fail('Gmail repeated a recovery page token; the checkpoint was not advanced.');
      pageToken = response.nextPageToken;
      progressed = true;
    }
    return resumeAt(pageToken);
  };

  let recovery = state.lastRecovery;
  let drained: Awaited<ReturnType<typeof drainHistory>> | undefined;
  try {
    drained = await drainHistory(state.historyId, state.historyPageToken);
  } catch (error) {
    if (getUpstreamErrorStatus(error) !== 404) throw error;
  }
  if (drained) {
    if (recovery?.pending && budget > 0) recovery = await searchRecent(recovery);
  } else {
    // Capture the cursor before searching so arrivals during recovery come through history.
    const baseline = await client.getProfile();
    const cursor = parseWithServiceError(
      historyIdSchema,
      baseline.historyId,
      'Gmail returned an invalid recovery checkpoint.'
    );
    recovery = await searchRecent({
      observedAt,
      since: new Date(
        Math.max(
          Date.parse(saved.activatedAt),
          Date.parse(state.checkedAt) - overlapMs,
          now - GMAIL_RECOVERY_WINDOW_MS
        )
      ).toISOString(),
      outageExceededWindow: Date.parse(state.checkedAt) < now - GMAIL_RECOVERY_WINDOW_MS
    });
    drained = budget > 0 ? await drainHistory(cursor) : { cursor, complete: false };
  }
  const pending = recovery?.pending && {
    ...recovery.pending,
    handled: recovery.pending.handled + remembered
  };
  return {
    events,
    updatedState: {
      version: state.version,
      accountId: state.accountId,
      mailbox: state.mailbox,
      historyId: drained.cursor,
      ...(drained.pageToken ? { historyPageToken: drained.pageToken } : {}),
      // Only a fully drained mailbox moves the lower bound of a later recovery.
      checkedAt: drained.complete && !pending ? observedAt : state.checkedAt,
      seen: newestSeen(seen),
      ...(recovery ? { lastRecovery: { ...recovery, ...(pending ? { pending } : {}) } } : {})
    } satisfies MailboxState
  };
};
