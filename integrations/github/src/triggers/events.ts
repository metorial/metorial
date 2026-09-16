import { SlateTrigger } from 'slates';
import { spec } from '../spec';
import { type GitHubEventName, githubEventNames, githubTriggerSchema } from './event-schemas';
import { repositoryEvents } from './events-trigger-group';

const descriptions: Record<GitHubEventName, [string, string]> = {
  push: [
    'Push',
    'Commits pushed to a branch or tag, including creation, deletion, and force pushes.'
  ],
  create: ['Branch or Tag Created', 'A Git branch or tag was created.'],
  delete: ['Branch or Tag Deleted', 'A Git branch or tag was deleted.'],
  repository: [
    'Repository Activity',
    'Repository settings and lifecycle activity supported by repository webhooks.'
  ],
  fork: ['Repository Forked', 'A fork of the repository was created.'],
  star: ['Repository Star', 'A repository was starred or unstarred.'],
  issues: [
    'Issue Activity',
    'Issue lifecycle activity, including opened, edited, closed, reopened, assigned, and labeled.'
  ],
  issue_comment: [
    'Issue or Pull Request Comment',
    'A conversation comment was created, edited, or deleted on an issue or pull request.'
  ],
  pull_request: [
    'Pull Request Activity',
    'Pull request activity including review requests and branch updates. Merges have action closed and payload.pull_request.merged=true.'
  ],
  pull_request_review: [
    'Pull Request Review',
    'A pull request review was submitted, edited, or dismissed.'
  ],
  pull_request_review_comment: [
    'Pull Request Review Comment',
    'A comment on a pull request diff was created, edited, or deleted.'
  ],
  pull_request_review_thread: [
    'Pull Request Review Thread',
    'A pull request review thread was resolved or unresolved.'
  ],
  discussion: [
    'Discussion Activity',
    'Discussion lifecycle activity, including creation, edits, and selected answers.'
  ],
  discussion_comment: [
    'Discussion Comment',
    'A comment on a discussion was created, edited, or deleted.'
  ],
  workflow_run: [
    'Workflow Run',
    'A GitHub Actions workflow run was requested, started, or completed.'
  ],
  workflow_job: [
    'Workflow Job',
    'GitHub Actions job activity, including queued, in-progress, and completed jobs.'
  ],
  check_run: [
    'Check Run',
    'A check run was created or completed. Repository hooks do not receive requested_action or rerequested actions.'
  ],
  check_suite: [
    'Check Suite',
    'A check suite completed. Repository hooks only receive the completed action.'
  ],
  status: [
    'Commit Status',
    'A commit status changed, including its context, result, and target URL.'
  ],
  release: [
    'Release Activity',
    'Release lifecycle activity, including publication, edits, and deletion.'
  ],
  deployment: ['Deployment', 'A deployment was created.'],
  deployment_status: [
    'Deployment Status',
    'A deployment status changed, including its environment and result.'
  ],
  dependabot_alert: [
    'Dependabot Alert',
    'Dependabot vulnerability alert activity, including creation, dismissal, reopening, and fixes.'
  ]
};

const createTrigger = <E extends GitHubEventName>(event: E) => {
  const schema = githubTriggerSchema(event);
  const [name, description] = descriptions[event];
  return SlateTrigger.create(spec, { key: event, name, description })
    .triggerGroup(repositoryEvents)
    .input(schema)
    .output(schema)
    .matches(
      input =>
        input !== null &&
        typeof input === 'object' &&
        'event' in input &&
        input.event === event &&
        schema.safeParse(input).success
    )
    .map(async ctx => ({
      id: ctx.input.deliveryId,
      type: ctx.input.action ? `${ctx.input.event}.${ctx.input.action}` : ctx.input.event,
      output: ctx.input
    }))
    .build();
};

export const githubTriggers = githubEventNames.map(createTrigger);
