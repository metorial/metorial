import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';
import { z } from 'zod';

export let apiFailure = (error: unknown, operation: string) => {
  if (error instanceof ServiceError) return error;
  let status = getApiErrorStatus(error);
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Mixmax',
      reason: 'mixmax_api_error',
      operation,
      parent: {},
      extractMessage: () =>
        status === 401 || status === 403
          ? 'Check the API token, permissions, and account feature access.'
          : status === 429
            ? 'Wait before retrying; the API rate limit was exceeded.'
            : 'Check the inputs and account feature access before retrying.'
    }
  );
};

export let parseResponse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  let result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError(
      'Mixmax returned an unexpected response. Check the resource and account feature access.'
    );
  return result.data;
};

export let resourceId = (value: string): string => {
  if (
    !value.trim() ||
    value !== value.trim() ||
    [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  ) {
    throw createApiServiceError(
      'Provide a nonempty resource ID without whitespace or control characters.'
    );
  }
  return encodeURIComponent(value);
};

export let validatePaging = (params: { limit?: number; offset?: number }, max = 300) => {
  if (
    params.limit !== undefined &&
    (!Number.isSafeInteger(params.limit) || params.limit < 1 || params.limit > max)
  ) {
    throw createApiServiceError(`limit must be an integer from 1 to ${max}.`);
  }
  if (
    params.offset !== undefined &&
    (!Number.isSafeInteger(params.offset) || params.offset < 0)
  ) {
    throw createApiServiceError('offset must be a nonnegative safe integer.');
  }
};

export let validateEmail = (value: string) => {
  if (!z.email().safeParse(value).success)
    throw createApiServiceError('Provide a valid email address.');
  return value;
};

let optionalText = z.preprocess(
  value => (value === null ? undefined : value),
  z.string().optional()
);
let dateText = z.preprocess(value => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    let date = new Date(value);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }
  return value;
}, z.string().optional());
let optionalBoolean = z.preprocess(
  value => (value === null ? undefined : value),
  z.boolean().optional()
);
let optionalNumber = z.preprocess(
  value => (value === null ? undefined : value),
  z.number().finite().optional()
);
let id = z.string().min(1);
let emailRecipient = z.object({ email: z.string(), name: optionalText });
let sender = z.preprocess(
  value => (typeof value === 'string' ? { email: value } : value),
  z.object({ email: optionalText, name: optionalText }).optional()
);

export let messageDto = z.object({
  _id: id,
  userId: optionalText,
  subject: optionalText,
  body: optionalText,
  to: z.array(emailRecipient).optional(),
  cc: z.array(emailRecipient).optional(),
  bcc: z.array(emailRecipient).optional(),
  from: sender,
  sent: dateText,
  scheduled: dateText,
  created: dateText,
  trackingEnabled: optionalBoolean,
  linkTrackingEnabled: optionalBoolean
});
export let snippetDto = z.object({
  _id: id,
  userId: optionalText,
  name: optionalText,
  title: optionalText,
  source: optionalText,
  deletedAt: dateText
});
export let contactDto = z.object({
  _id: id,
  userId: optionalText,
  email: optionalText,
  name: optionalText,
  firstName: optionalText,
  lastName: optionalText,
  groups: z.array(z.string()).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  createdAt: dateText
});
export let sequenceDto = z.object({
  _id: id,
  name: optionalText,
  userId: optionalText,
  stages: z.array(z.unknown()).optional(),
  createdAt: dateText,
  updatedAt: dateText
});
export let recipientDto = z.object({
  _id: optionalText,
  email: z.string(),
  name: optionalText,
  sequenceId: optionalText,
  userId: optionalText,
  state: optionalText,
  status: optionalText,
  createdAt: dateText,
  variables: z.record(z.string(), z.string()).optional()
});
export let teamDto = z.object({
  _id: id,
  name: optionalText,
  createdAt: dateText,
  modifiedAt: dateText
});
export let teamMemberDto = z.object({
  memberId: id,
  userId: z
    .union([z.string(), z.object({ _id: id, email: optionalText, name: optionalText })])
    .optional(),
  email: optionalText,
  name: optionalText
});
export let meetingTypeDto = z.object({
  _id: id,
  name: optionalText,
  userId: optionalText,
  durationMin: optionalNumber,
  buffer: optionalNumber,
  createdAt: dateText,
  updatedAt: dateText,
  defaults: z
    .object({ title: optionalText, location: optionalText, description: optionalText })
    .optional()
});
export let meetingInviteDto = z.object({
  _id: id,
  title: optionalText,
  timezone: optionalText,
  creationDate: dateText,
  organizer: z.object({ email: optionalText, name: optionalText }).optional(),
  guest: z.object({ email: optionalText, name: optionalText }).optional()
});
export let ruleDto = z.object({
  _id: id,
  userId: optionalText,
  name: optionalText,
  isPaused: optionalBoolean,
  trigger: z.unknown().optional(),
  filter: z.unknown().optional(),
  actions: z.array(z.unknown()).optional(),
  createdAt: dateText,
  modifiedAt: dateText
});
export let unsubscribeDto = z.object({ email: z.string(), createdAt: dateText });
export let pollDto = z.object({
  _id: id,
  question: optionalText,
  livePoll: optionalBoolean,
  createdAt: dateText,
  options: z
    .array(
      z.object({
        text: optionalText,
        respondents: z
          .array(z.object({ email: optionalText, name: optionalText, respondedAt: dateText }))
          .optional()
      })
    )
    .optional()
});
let flag = z.preprocess(
  value => (value === 0 ? false : value === 1 ? true : value),
  optionalBoolean
);
export let liveFeedDto = z.object({
  _id: id,
  fromEmail: optionalText,
  fromName: optionalText,
  subject: optionalText,
  recipients: z.array(z.unknown()).optional(),
  sent: optionalNumber,
  numOpens: optionalNumber,
  numClicks: optionalNumber,
  numDownloads: optionalNumber,
  wasReplied: flag,
  wasBounced: flag,
  lastEventType: optionalText,
  lastEventAt: optionalNumber,
  permalink: optionalText
});
export let userDto = z.object({ _id: id, email: optionalText, name: optionalText });
export let taskDto = z.object({
  _id: id,
  type: optionalText,
  subject: optionalText,
  status: optionalText,
  isCompleted: optionalBoolean,
  due: dateText,
  priority: optionalText,
  assignee: z.object({ id: id, name: optionalText, email: optionalText }).optional(),
  sequence: z.object({ id: id, name: optionalText, stage: optionalText }).optional()
});
export let reportDto = z.object({
  buckets: z.array(z.unknown()),
  totals: z.unknown().optional(),
  extra: z
    .object({
      dateRange: z.unknown().optional(),
      hasNext: optionalBoolean,
      total: optionalNumber
    })
    .optional()
});
export let recordDto = z.record(z.string(), z.unknown());
export let pageDto = <T extends z.ZodType>(item: T) =>
  z.object({ results: z.array(item), next: optionalText, hasNext: optionalBoolean });
