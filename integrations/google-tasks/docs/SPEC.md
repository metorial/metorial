# Google Tasks Specification

## Overview

Google Tasks is a task management service by Google that allows users to create and manage to-do lists. It lets users capture and manage to-dos anywhere in Google Workspace, and integrates directly with Google Calendar. The API is based on two core resources: Task Lists (each user has at least one default list) and Tasks within those lists.

## Authentication

Google Tasks API uses **OAuth 2.0** exclusively for authentication, as it accesses user-specific data.

**Setup Requirements:**

- You need to create one or more OAuth 2.0 Client IDs in the Google Cloud Console. A client ID is used to identify a single app to Google's OAuth servers. If your app runs on multiple platforms, you must create a separate client ID for each platform.
- Enable the Google Tasks API in your Google Cloud project.
- Configure an OAuth consent screen.

**OAuth 2.0 Endpoints:**

- Authorization endpoint: `https://accounts.google.com/o/oauth2/v2/auth`
- Token endpoint: `https://oauth2.googleapis.com/token`

**Required Credentials:**

- Client ID
- Client Secret
- Redirect URI

**Scopes:**

| Scope                                            | Description                                        |
| ------------------------------------------------ | -------------------------------------------------- |
| `https://www.googleapis.com/auth/tasks`          | Create, edit, organize, and delete all your tasks. |
| `https://www.googleapis.com/auth/tasks.readonly` | View your tasks.                                   |
| `https://www.googleapis.com/auth/userinfo.profile` | Identify the connected Google account. |
| `https://www.googleapis.com/auth/userinfo.email` | View the connected account email and identity. |

Use `access_type=offline` when generating the authorization URL to receive a refresh token for long-lived access.

## Features

### Task List Management

Create, read, update, and delete task lists for the authenticated user. Each user has at least one default task list. Task lists serve as containers that organize tasks into groups.

### Task Management

Create, read, update, and delete individual tasks within a task list. Tasks support the following properties:

- Title and notes (description)
- Due date (date only, time portion is discarded)
- Completion status and completion date
- Deleted status

**Limitations:**

- A user can have up to 20,000 non-hidden tasks per list and up to 100,000 tasks in total.
- Tasks assigned from Docs or Chat Spaces cannot be inserted from the Tasks API; they can only be created by assigning them from Docs or Chat Spaces.
- Listing assigned tasks requires `showAssigned=true`; ordinary task listings and the completion trigger exclude them.

### Task Ordering and Hierarchy

Move tasks to different positions within a task list or between task lists. Tasks can be moved within their current list or to a destination list, including putting a task as a child task under a new parent and/or moving it to a different position among its sibling tasks.

- A user can have up to 2,000 subtasks per task.

### Clearing Completed Tasks

Clear all completed tasks from a specified task list in a single operation.

### Filtering and Syncing

When listing tasks, you can filter by completion status and use the `updatedMin` parameter to retrieve only tasks modified after a certain time, enabling efficient incremental sync.

The `list_tasks` tool accepts an optional task-list ID. Supplying an ID lists tasks only from that list, preserving the original single-list behavior. An empty or whitespace-only `taskListId` is rejected with a validation error instead of being forwarded to Google, which would otherwise produce an opaque upstream failure. Omitting it paginates through every task list and every task page, returning each task with its source task-list ID and title; aggregating across all task lists can be slow and produce large results for accounts with many lists.

## Events

### Task Completed (`task_completed`)

Google Tasks provides no native change subscription. The `task_completion_events` polling group checks every 15 minutes and keeps a checkpoint: the time through which every task list has been read. Each check observes tasks currently completed between one hour before the checkpoint and the current time, including the lower and upper time boundaries, and moves the checkpoint to that current time only after every page of every task list was read. The first check has no checkpoint and covers the preceding hour. It fully paginates task lists and tasks with `completedMin`/`completedMax`, `showCompleted=true`, `showHidden=true`, `showDeleted=false`, and `showAssigned=false`. Hidden tasks, including tasks hidden by clearing completed tasks, remain eligible; deleted, assigned, incomplete, and invalid-timestamp tasks do not emit events. Pages with no items but a next-page token are followed. Invalid pages and upstream failures fail the check without moving the checkpoint, so the next check covers the same period again. A single task that does not have the documented task fields is skipped instead: the check continues, the checkpoint moves, and a warning names the task list, the task ID, and the task's timestamps, never its title, notes, or links. At most ten such warnings are written per check, followed by the total number skipped.

An interruption of any length is therefore recovered: the next successful check reads everything completed since the checkpoint. `tasks.list` returns at most 100 tasks per page and documents no result order, so a period is never split inside one task list. Once a check has read 50 task pages or has run for 30 seconds, it finishes the task list in progress and stops; the period is kept as it is, and following checks read the remaining task lists, in task-list ID order, before a newer period starts. A checkpoint later than the current time is treated as the current time, and an unreadable checkpoint restarts from the preceding hour with a warning. When no checkpoint is kept between checks, every check covers the preceding hour, as the first one does.

Account identity is resolved from the authenticated Google userinfo endpoint, requiring either the declared profile or email scope in addition to Tasks read access. No account ID configuration is required. The trigger maps only observations belonging to the authenticated account.

Outputs include `accountId`, `taskListId`, optional `taskListTitle`, `taskId`, optional `title`, `status=completed`, provider `completed` and optional `updated` timestamps, optional hidden status and links, and `observedAt`. The completion identity contains account, list, task, and the provider's completion timestamp. It excludes modification time and etag, so title edits and clearing completed tasks retain the original identity. A different completion timestamp after reopening produces a different identity; moving between lists also changes identity and can produce another observation.

This is an observation, not exact transition history or a task-creation event. Initial activation can replay completions from the preceding hour. The one-hour overlap re-reads completions that were already reported. The group remembers a short fingerprint and the completion time of every completion it reported inside the overlap, skips those on later checks, and forgets each one once the overlap has moved past it, so an interruption of any length does not report a completion twice. A task that is reopened and completed again has a new completion time and is reported again. At most 10,000 completions are remembered; beyond that the newest are kept, a warning is written, and the oldest can be reported a second time. A completion whose timestamp lies more than an hour before the checkpoint when it first becomes visible is not observed. A task completed and reopened between checks can be missed. Recompletion cannot be distinguished if Google preserves the original completion timestamp. Task pagination is not an atomic snapshot, so concurrent edits or moves can affect observations.

Sources: [tasks.list](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/list), [Task resource](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks), and [Google userinfo contract](https://www.googleapis.com/discovery/v1/apis/oauth2/v2/rest).
