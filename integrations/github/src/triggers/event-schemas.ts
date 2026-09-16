import { z } from 'zod';

const id = z.number().int().positive();
const text = z.string().nullish();
const timestamp = z.string().nullish();

// Loose objects at every modeled level retain provider additions and action-specific data.
// Requiredness and nullability follow GitHub's OpenAPI webhook description (checked by the
// schema contract tests in the enterprise repo, tests/integrations/github/triggers.schema.test.ts),
// which is looser than typical deliveries: array items and owners may be null, and several
// fields are optional for some actions.
export const actorSchema = z.looseObject({
  id: id.optional(),
  login: text,
  name: text,
  html_url: text,
  type: text
});
export const repositorySchema = z.looseObject({
  id,
  name: z.string(),
  full_name: z.string(),
  owner: actorSchema.nullable(),
  html_url: z.string(),
  private: z.boolean().optional(),
  default_branch: text
});
const labelSchema = z.looseObject({ name: z.string(), id: id.optional(), color: text });
const issueSchema = z.looseObject({
  id,
  number: z.number().int().positive(),
  title: z.string(),
  body: text,
  state: z.string().optional(),
  html_url: z.string(),
  user: actorSchema.nullish(),
  labels: z.array(labelSchema.nullable()).nullish(),
  assignees: z.array(actorSchema.nullable()).nullish(),
  milestone: z.looseObject({ id, title: z.string() }).nullish(),
  pull_request: z.looseObject({ html_url: text, url: text }).optional(),
  created_at: timestamp,
  updated_at: timestamp,
  closed_at: timestamp
});
const refSchema = z.looseObject({
  ref: z.string(),
  sha: z.string(),
  label: text,
  repo: repositorySchema.nullish(),
  user: actorSchema.nullish()
});
const pullRequestSchema = issueSchema.extend({
  state: z.string(),
  head: refSchema,
  base: refSchema,
  draft: z.boolean().optional(),
  merged: z.boolean().nullish(),
  merged_by: actorSchema.nullish(),
  merged_at: timestamp,
  merge_commit_sha: text,
  requested_reviewers: z.array(actorSchema.nullable()).nullish()
});
const commentSchema = z.looseObject({
  id,
  body: text,
  html_url: z.string(),
  user: actorSchema.nullish(),
  created_at: timestamp,
  updated_at: timestamp,
  path: text,
  line: z.number().int().nullish(),
  original_line: z.number().int().nullish(),
  commit_id: text,
  in_reply_to_id: id.optional()
});
const discussionSchema = z.looseObject({
  id,
  number: z.number().int().positive(),
  title: z.string(),
  body: text,
  html_url: z.string(),
  user: actorSchema.nullish(),
  category: z.looseObject({ id, name: z.string() }).optional(),
  answer_html_url: text,
  answer_chosen_at: timestamp,
  created_at: timestamp,
  updated_at: timestamp
});
const checkSchema = z.looseObject({
  id,
  head_sha: z.string(),
  status: z.string().nullable(),
  conclusion: text,
  head_branch: text,
  url: text,
  pull_requests: z.array(z.looseObject({ id, number: z.number().int() })).optional()
});
const deploymentSchema = z.looseObject({
  id,
  sha: z.string(),
  ref: z.string(),
  environment: z.string(),
  description: text,
  task: text,
  creator: actorSchema.nullish(),
  created_at: timestamp,
  updated_at: timestamp
});
const commitSchema = z.looseObject({
  id: z.string(),
  message: z.string(),
  url: z.string(),
  author: z.looseObject({ name: text, email: text, username: text }),
  timestamp,
  added: z.array(z.string()).optional(),
  removed: z.array(z.string()).optional(),
  modified: z.array(z.string()).optional()
});
const base = z.looseObject({
  repository: repositorySchema,
  sender: actorSchema.nullish(),
  action: z.string().min(1).optional()
});
const activity = base.extend({ action: z.string().min(1) });

export const githubEventSchemas = {
  push: base.extend({
    ref: z.string(),
    before: z.string(),
    after: z.string(),
    created: z.boolean(),
    deleted: z.boolean(),
    forced: z.boolean(),
    compare: z.string(),
    commits: z.array(commitSchema),
    head_commit: commitSchema.nullable(),
    pusher: z.looseObject({ name: z.string(), email: text })
  }),
  create: base.extend({ ref: z.string(), ref_type: z.enum(['branch', 'tag']) }),
  delete: base.extend({ ref: z.string(), ref_type: z.enum(['branch', 'tag']) }),
  repository: activity,
  fork: base.extend({ forkee: repositorySchema }),
  star: activity.extend({ starred_at: timestamp }),
  issues: activity.extend({ issue: issueSchema }),
  issue_comment: activity.extend({ issue: issueSchema, comment: commentSchema }),
  pull_request: activity.extend({ pull_request: pullRequestSchema }),
  pull_request_review: activity.extend({
    pull_request: pullRequestSchema,
    review: z.looseObject({
      id,
      state: z.string(),
      body: text,
      html_url: z.string(),
      user: actorSchema.nullish(),
      commit_id: text,
      submitted_at: timestamp
    })
  }),
  pull_request_review_comment: activity.extend({
    pull_request: pullRequestSchema,
    comment: commentSchema
  }),
  pull_request_review_thread: activity.extend({
    pull_request: pullRequestSchema,
    thread: z.looseObject({
      id: id.optional(),
      node_id: z.string().optional(),
      comments: z.array(commentSchema),
      resolved: z.boolean().optional()
    })
  }),
  discussion: activity.extend({ discussion: discussionSchema }),
  discussion_comment: activity.extend({
    discussion: discussionSchema,
    comment: commentSchema
  }),
  workflow_run: activity.extend({
    workflow: z.looseObject({ id, name: text, path: text }).nullable(),
    workflow_run: z.looseObject({
      id,
      workflow_id: id,
      name: text,
      html_url: z.string(),
      head_sha: z.string(),
      head_branch: text,
      event: z.string(),
      status: z.string(),
      conclusion: text,
      run_number: z.number().int(),
      run_attempt: z.number().int().optional(),
      actor: actorSchema.nullish(),
      created_at: timestamp,
      updated_at: timestamp
    })
  }),
  workflow_job: activity.extend({
    workflow_job: z.looseObject({
      id,
      run_id: z.number(),
      name: z.string(),
      html_url: z.string(),
      head_sha: z.string(),
      head_branch: text,
      status: z.string(),
      conclusion: text,
      started_at: timestamp,
      completed_at: timestamp,
      steps: z
        .array(
          z.looseObject({
            name: z.string(),
            status: z.string(),
            conclusion: text,
            number: z.number().int(),
            started_at: timestamp,
            completed_at: timestamp
          })
        )
        .optional()
    })
  }),
  // GitHub's contract marks `action` optional for check_run deliveries.
  check_run: base.extend({
    check_run: checkSchema.extend({
      name: z.string(),
      html_url: text,
      started_at: timestamp,
      completed_at: timestamp,
      output: z.looseObject({ title: text, summary: text, text }).optional()
    })
  }),
  check_suite: activity.extend({ check_suite: checkSchema }),
  status: base.extend({
    id,
    sha: z.string(),
    state: z.string(),
    context: z.string(),
    description: text,
    target_url: text,
    created_at: timestamp,
    updated_at: timestamp
  }),
  release: activity.extend({
    release: z.looseObject({
      id,
      tag_name: z.string(),
      name: text,
      body: text,
      html_url: z.string(),
      draft: z.boolean(),
      prerelease: z.boolean(),
      author: actorSchema.nullish(),
      created_at: timestamp,
      published_at: timestamp,
      assets: z
        .array(
          z
            .looseObject({
              id,
              name: z.string(),
              browser_download_url: z.string(),
              size: z.number()
            })
            .nullable()
        )
        .optional()
    })
  }),
  deployment: base.extend({ deployment: deploymentSchema }),
  deployment_status: base.extend({
    deployment: deploymentSchema,
    deployment_status: z.looseObject({
      id,
      state: z.string(),
      description: text,
      environment: text,
      environment_url: text,
      target_url: text,
      log_url: text,
      creator: actorSchema.nullish(),
      created_at: timestamp,
      updated_at: timestamp
    })
  }),
  dependabot_alert: activity.extend({
    alert: z.looseObject({
      number: z.number().int().positive(),
      state: z.string(),
      html_url: z.string(),
      dependency: z.looseObject({
        package: z.looseObject({ name: z.string(), ecosystem: z.string() }).optional(),
        manifest_path: z.string().optional(),
        scope: text
      }),
      security_advisory: z.looseObject({
        ghsa_id: z.string(),
        cve_id: text,
        summary: z.string(),
        severity: z.string()
      }),
      created_at: timestamp,
      updated_at: timestamp,
      dismissed_at: timestamp,
      fixed_at: timestamp
    })
  })
} as const;

export type GitHubEventName = keyof typeof githubEventSchemas;
export const githubEventNames = Object.keys(githubEventSchemas) as GitHubEventName[];
export const isGitHubEventName = (event: string): event is GitHubEventName =>
  Object.hasOwn(githubEventSchemas, event);

export const githubEventEnvelopeSchema = z.object({
  deliveryId: z.string().min(1),
  event: z.string().min(1),
  action: z.string().nullable(),
  payload: z.record(z.string(), z.unknown())
});

export const githubTriggerSchema = <E extends GitHubEventName>(event: E) =>
  githubEventEnvelopeSchema.extend({
    event: z.literal(event),
    payload: githubEventSchemas[event]
  });
