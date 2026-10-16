import { buildApiServiceError, createApiServiceError } from 'slates';
import { z } from 'zod';

export let stackExchangeError = (error: unknown, observeBody?: (body: unknown) => void) =>
  buildApiServiceError(error, {
    providerLabel: 'Stack Exchange',
    reason: 'stack_exchange_api_error',
    extractResponse: (value, helpers) => {
      let response = helpers.getResponseWithBody(value);
      observeBody?.(response?.data);
      return response;
    },
    detailKeys: ['error_message', 'error_name', 'message', 'type', 'error_description'],
    nestedKeys: ['error'],
    extractUpstreamCode: (_error, response) => {
      let data = response?.data;
      return data && typeof data === 'object' && 'error_id' in data
        ? String(data.error_id)
        : undefined;
    }
  });

export let parseProviderData = <T>(schema: z.ZodType<T>, data: unknown, label: string): T => {
  let result = schema.safeParse(data);
  if (!result.success)
    throw createApiServiceError(`Stack Exchange returned invalid ${label}.`, {
      reason: 'stack_exchange_invalid_response'
    });
  return result.data;
};

export let providerDate = (value: unknown): string => {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw createApiServiceError('Stack Exchange returned an invalid timestamp.');
  let date = new Date(value * 1000);
  if (Number.isNaN(date.getTime()))
    throw createApiServiceError('Stack Exchange returned an invalid timestamp.');
  return date.toISOString();
};

export let optionalProviderDate = (value: unknown) =>
  value === undefined ? undefined : providerDate(value);

export let requireOAuth = (token: string) => {
  if (!token.trim())
    throw createApiServiceError('Connect with OAuth to access this user operation.');
};

export let pathIds = (values: string[], label: string, max = 100) => {
  if (!values.length || values.length > max || values.some(value => !/^-?\d+$/.test(value)))
    throw createApiServiceError(`${label} must contain 1 to ${max} numeric IDs.`);
  return values.map(encodeURIComponent).join(';');
};

export let tagPath = (values: string[], max = 100) => {
  if (!values.length || values.length > max || values.some(value => !value.trim()))
    throw createApiServiceError(`Provide 1 to ${max} non-empty tag names.`);
  return values.map(encodeURIComponent).join(';');
};

export let pagination = (page?: number, pageSize?: number, unbounded = false) => {
  if (page !== undefined && (!Number.isSafeInteger(page) || page < 1))
    throw createApiServiceError('page must be an integer of at least 1.');
  if (
    pageSize !== undefined &&
    (!Number.isSafeInteger(pageSize) || pageSize < 0 || (!unbounded && pageSize > 100))
  )
    throw createApiServiceError(
      unbounded
        ? 'pageSize must be a non-negative integer.'
        : 'pageSize must be an integer between 0 and 100.'
    );
};

let question = z.object({
  question_id: z.number(),
  title: z.string(),
  link: z.string(),
  score: z.number(),
  answer_count: z.number(),
  view_count: z.number(),
  is_answered: z.boolean(),
  tags: z.array(z.string()),
  creation_date: z.number()
});
let answer = z.object({
  answer_id: z.number(),
  question_id: z.number(),
  score: z.number(),
  is_accepted: z.boolean(),
  creation_date: z.number()
});
let wrapper = z.object({
  items: z.array(z.record(z.string(), z.any())),
  has_more: z.boolean(),
  quota_max: z.number(),
  quota_remaining: z.number(),
  backoff: z.number().optional()
});

export let decodeResponse = (value: unknown, path: string) => {
  if (value && typeof value === 'object' && ('error_id' in value || 'error' in value))
    throw stackExchangeError({ response: { data: value } });
  let data = parseProviderData(wrapper, value, 'response envelope');
  let schema: z.ZodType | undefined;
  if (/^\/questions\/add$|^\/questions\/[^/]+\/edit$/.test(path)) {
    schema = question.pick({ question_id: true, title: true, link: true });
  } else if (
    /\/answers(?:\/add|\/[^/]+\/(?:edit|accept(?:\/undo)?))?$/.test(path) ||
    (/^\/answers\//.test(path) && !path.endsWith('/comments'))
  ) {
    schema = answer;
  } else if (
    /^\/(?:questions|search)(?:\/[^/]+)?$/.test(path) ||
    (/\/(?:linked|related|questions)$/.test(path) && !path.startsWith('/tags/'))
  ) {
    schema = question;
  } else if (path.endsWith('/faq')) {
    schema = question.pick({
      question_id: true,
      title: true,
      link: true,
      score: true,
      answer_count: true
    });
  } else if (/^\/users(?:\/[^/]+)?$/.test(path) || path === '/me') {
    schema = z.object({
      user_id: z.number(),
      display_name: z.string(),
      reputation: z.number(),
      creation_date: z.number()
    });
  } else if (path.endsWith('/top-answer-tags')) {
    schema = z.object({
      tag_name: z.string(),
      answer_count: z.number(),
      answer_score: z.number(),
      question_count: z.number(),
      question_score: z.number()
    });
  } else if (path.endsWith('/reputation')) {
    schema = z.object({ reputation_change: z.number(), on_date: z.number() });
  } else if (path === '/tags' || /^\/tags\/[^/]+\/(?:info|related)$/.test(path)) {
    schema = z.object({ name: z.string(), count: z.number() });
  } else if (path.endsWith('/synonyms')) {
    schema = z.object({ from_tag: z.string(), to_tag: z.string() });
  } else if (path === '/sites') {
    schema = z.object({
      api_site_parameter: z.string(),
      name: z.string(),
      site_url: z.string()
    });
  } else if (path.endsWith('/comments') || /^\/comments\/[^/]+$/.test(path)) {
    schema = z.object({
      comment_id: z.number(),
      score: z.number(),
      creation_date: z.number()
    });
  } else if (/\/comments\/add$|^\/comments\/[^/]+\/edit$/.test(path)) {
    schema = z.object({ comment_id: z.number() });
  }
  if (schema) for (let item of data.items) parseProviderData(schema, item, 'response item');
  return data;
};
