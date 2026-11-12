import {
  assertNewPageToken,
  buildApiServiceError,
  createApiServiceError,
  pruneSeenEntries,
  type SeenEntry,
  seenEntryKey,
  seenEntrySchema,
  triggerGroup
} from 'slates';
import { z } from 'zod';
import { GoogleTasksClient } from '../lib/client';
import { spec } from '../spec';
import {
  completionTimestampSchema,
  type TaskCompletedEvent,
  taskCompletedEventSchema,
  taskCompletionId
} from './event-schemas';

const ACTIVATION_WINDOW_MS = 60 * 60 * 1000;
const OVERLAP_MS = 60 * 60 * 1000;
// A check stops at the first task-list boundary past either limit.
export const TASK_POLL_PAGE_BUDGET = 50;
const TASK_POLL_BUDGET_MS = 30_000;
export const TASK_SEEN_MAX_ENTRIES = 10_000;
const INVALID_TASK_WARNINGS = 10;

let taskListSchema = z.object({ id: z.string().trim().min(1), title: z.string().optional() });
let taskSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().optional(),
  status: z.string().optional(),
  completed: z.string().optional(),
  updated: z.string().optional(),
  deleted: z.boolean().optional(),
  hidden: z.boolean().optional(),
  assignmentInfo: z.unknown().optional(),
  webViewLink: z.string().optional(),
  links: taskCompletedEventSchema.shape.links
});

// `checkpoint`: time through which every list was read. `scan`: a window out of page budget,
// done up to `afterListId` (ID order). `seen`: reported completions a later read may return.
let pollStateSchema = z.object({
  checkpoint: completionTimestampSchema,
  scan: z
    .object({
      from: completionTimestampSchema,
      to: completionTimestampSchema,
      afterListId: z.string().min(1)
    })
    .optional(),
  seen: z.array(seenEntrySchema).optional()
});
type PollState = z.infer<typeof pollStateSchema>;
type Warn = (message: { reason: string; message: string }) => void;

let resolveWindow = (
  state: unknown,
  now: number,
  warn: Warn
): { from: number; to: number; afterListId?: string; seen: SeenEntry[] } => {
  if (state === null || state === undefined)
    return { from: now - ACTIVATION_WINDOW_MS, to: now, seen: [] };
  let saved = pollStateSchema.safeParse(state);
  if (!saved.success) {
    warn({
      reason: 'google_tasks_poll_state_invalid',
      message:
        'The saved completion checkpoint is unreadable. Starting again from the past hour.'
    });
    return { from: now - ACTIVATION_WINDOW_MS, to: now, seen: [] };
  }
  let seen = saved.data.seen ?? [];
  let scan = saved.data.scan;
  if (scan) {
    let from = Date.parse(scan.from);
    let to = Math.min(Date.parse(scan.to), now);
    if (from <= to) return { from, to, afterListId: scan.afterListId, seen };
  }
  let checkpoint = Date.parse(saved.data.checkpoint);
  if (checkpoint > now) {
    warn({
      reason: 'google_tasks_checkpoint_in_future',
      message:
        'The saved completion checkpoint is ahead of the current time and was reset to now.'
    });
    checkpoint = now;
  }
  return { from: checkpoint - OVERLAP_MS, to: now, seen };
};

// Validate each page before using it; a bad item fails the page unless the caller skips it.
async function* pages<T>(
  schema: z.ZodType<T>,
  fetchPage: (pageToken?: string) => Promise<unknown>,
  skipInvalidItem?: (item: unknown, error: z.ZodError) => void
) {
  let pageSchema = z.object({
    items: z.array(z.unknown()).optional(),
    nextPageToken: z.string().optional()
  });
  let invalidPage = () =>
    createApiServiceError('Google Tasks returned an invalid listing response.', {
      reason: 'google_tasks_invalid_poll_page'
    });
  let pageToken: string | undefined;
  let seenTokens = new Set<string>();
  do {
    let parsed = pageSchema.safeParse(await fetchPage(pageToken));
    if (!parsed.success) throw invalidPage();
    for (let item of parsed.data.items ?? []) {
      let valid = schema.safeParse(item);
      if (valid.success) yield valid.data;
      else if (skipInvalidItem) skipInvalidItem(item, valid.error);
      else throw invalidPage();
    }
    pageToken = parsed.data.nextPageToken || undefined;
    assertNewPageToken(seenTokens, pageToken, () =>
      createApiServiceError('Google Tasks repeated a pagination token. Retry the poll.', {
        reason: 'google_tasks_repeated_page_token'
      })
    );
  } while (pageToken);
}

// Only provider identifiers and timestamps are logged for a skipped task, never its text.
let identifier = (item: unknown, field: string) => {
  let value =
    typeof item === 'object' && item !== null
      ? (item as Record<string, unknown>)[field]
      : undefined;
  return typeof value === 'string' && value.trim() ? value.slice(0, 128) : undefined;
};

export let taskCompletionEvents = triggerGroup(spec, {
  key: 'task_completion_events',
  name: 'Recent Task Completions',
  description:
    'Checks all task lists every 15 minutes for non-assigned tasks completed since the previous check.',
  eventSchema: taskCompletedEventSchema
})
  .polling({
    intervalSeconds: 900,
    pollEvents: async ctx => {
      try {
        let client = new GoogleTasksClient(ctx.auth.token);
        let accountId = await client.getAccountId();
        let now = Date.now();
        let observedAt = new Date(now).toISOString();
        let window = resolveWindow(ctx.input.state, now, message => ctx.warn(message));
        let completedMin = new Date(window.from).toISOString();
        let completedMax = new Date(window.to).toISOString();
        let events: { payload: TaskCompletedEvent; idempotencyKey: string }[] = [];
        let reported = new Map(
          window.seen
            .filter(entry => entry.at >= window.from)
            .map(entry => [entry.key, entry.at])
        );
        let reportedNow = new Map<string, number>();
        let invalidTasks = 0;

        // tasks.list has no documented order, so windows resume by task list in ID order, never mid-list.
        let lists = new Map<string, z.infer<typeof taskListSchema>>();
        for await (let list of pages(taskListSchema, pageToken =>
          client.listTaskLists({ maxResults: 100, pageToken })
        )) {
          lists.set(list.id, list);
        }
        let resumeAfter = window.afterListId;
        let pending = [...lists.values()]
          .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
          .filter(list => resumeAfter === undefined || list.id > resumeAfter);

        let taskPages = 0;
        let stoppedAfter: string | undefined;
        for (let [index, list] of pending.entries()) {
          let skipInvalidTask = (item: unknown, error: z.ZodError) => {
            invalidTasks += 1;
            if (invalidTasks > INVALID_TASK_WARNINGS) return;
            ctx.warn({
              reason: 'google_tasks_task_invalid',
              message:
                'Skipped a task that Google returned in an unexpected form. Other tasks were read.',
              taskListId: list.id,
              taskId: identifier(item, 'id'),
              completed: identifier(item, 'completed'),
              updated: identifier(item, 'updated'),
              fields: [
                ...new Set(error.issues.map(issue => issue.path.join('.')).filter(Boolean))
              ]
            });
          };
          for await (let task of pages(
            taskSchema,
            pageToken => {
              taskPages += 1;
              return client.listTasks(list.id, {
                maxResults: 100,
                pageToken,
                completedMin,
                completedMax,
                showCompleted: true,
                showHidden: true,
                showDeleted: false,
                showAssigned: false
              });
            },
            skipInvalidTask
          )) {
            let completion = completionTimestampSchema.safeParse(task.completed);
            if (
              task.status !== 'completed' ||
              task.deleted ||
              task.assignmentInfo != null ||
              !completion.success
            )
              continue;
            let completed = completion.data;
            let completedAt = Date.parse(completed);
            if (completedAt < window.from || completedAt > window.to) continue;

            let payload: TaskCompletedEvent = {
              type: 'task.completed',
              accountId,
              taskListId: list.id,
              taskListTitle: list.title,
              taskId: task.id,
              title: task.title,
              status: 'completed',
              completed,
              updated: task.updated,
              hidden: task.hidden,
              webViewLink: task.webViewLink,
              links: task.links,
              observedAt
            };
            let idempotencyKey = taskCompletionId(payload);
            let key = seenEntryKey(idempotencyKey);
            if (reported.has(key) || reportedNow.has(key)) continue;
            reportedNow.set(key, completedAt);
            events.push({ payload, idempotencyKey });
          }
          let overBudget =
            taskPages >= TASK_POLL_PAGE_BUDGET || Date.now() - now >= TASK_POLL_BUDGET_MS;
          if (overBudget && index < pending.length - 1) {
            stoppedAfter = list.id;
            break;
          }
        }

        if (invalidTasks > INVALID_TASK_WARNINGS) {
          ctx.warn({
            reason: 'google_tasks_task_invalid',
            message: `Skipped ${invalidTasks} tasks that Google returned in an unexpected form; only the first ${INVALID_TASK_WARNINGS} are listed.`
          });
        }

        // The next window starts one overlap earlier; entries stay until an unfinished window is done.
        let partial = stoppedAfter !== undefined;
        let nextWindowStart = window.to - OVERLAP_MS;
        let seen = pruneSeenEntries(
          [
            ...[...reported].map(([key, at]) => ({ key, at, retain: partial })),
            ...[...reportedNow].map(([key, at]) => ({ key, at }))
          ],
          {
            cutoff: nextWindowStart,
            maxEntries: TASK_SEEN_MAX_ENTRIES,
            onOverflow: dropped =>
              ctx.warn({
                reason: 'google_tasks_seen_overflow',
                message: `More than ${TASK_SEEN_MAX_ENTRIES} recent completions would have to be remembered. The oldest ${dropped} can be reported again.`
              })
          }
        );

        if (stoppedAfter !== undefined) {
          ctx.warn({
            reason: 'google_tasks_completion_scan_partial',
            message: `Read ${taskPages} task pages in this check. The remaining task lists are read on the next check before newer completions.`
          });
          let updatedState: PollState = {
            checkpoint: completedMin,
            scan: { from: completedMin, to: completedMax, afterListId: stoppedAfter },
            seen
          };
          return { events, updatedState };
        }
        let updatedState: PollState = { checkpoint: completedMax, seen };
        return { events, updatedState };
      } catch (error) {
        throw buildApiServiceError(error, {
          providerLabel: 'Google Tasks',
          operation: 'observe recent task completions',
          reason: 'google_tasks_completion_poll_failed',
          nestedKeys: ['error', 'errors']
        });
      }
    }
  })
  .routingMatchers(async ctx => [
    { accountId: await new GoogleTasksClient(ctx.auth.token).getAccountId() }
  ])
  .build();
