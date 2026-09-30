import { createApiServiceError } from 'slates';
import { z } from 'zod';
import { ContextClient, pathId } from '../lib/client';
import { responseMetadata } from '../lib/response';
import { contextTool } from '../lib/tools';

const logEntrySchema = z
  .object({
    request_id: z.string(),
    timestamp: z.string(),
    method: z.string(),
    path: z.string(),
    status_code: z.number().int(),
    error_code: z.string().nullable(),
    latency_ms: z.number(),
    credits_used: z.number().int(),
    key_id: z.string().nullable(),
    tags: z.array(z.string()),
    zdr: z.boolean()
  })
  .passthrough();

const listLogsSchema = z
  .object({
    data: z.array(logEntrySchema),
    page: z.number().int(),
    limit: z.number().int(),
    has_more: z.boolean(),
    ...responseMetadata
  })
  .passthrough();

const listLogs = contextTool('list-logs')
  .output(listLogsSchema)
  .handleInvocation(async ctx => {
    if (
      ctx.input.from &&
      ctx.input.to &&
      Date.parse(ctx.input.from) > Date.parse(ctx.input.to)
    ) {
      throw createApiServiceError('from must be before or equal to to.');
    }
    if (ctx.input.tags !== undefined) {
      const tags = ctx.input.tags.split(',');
      if (tags.length > 20 || tags.some((tag: string) => tag.length < 1 || tag.length > 50)) {
        throw createApiServiceError(
          'Provide up to 20 comma-separated tags, each 1–50 characters.'
        );
      }
    }
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof listLogsSchema>
    >('list API request logs', { method: 'GET', path: '/org/logs', query: ctx.input });
    return {
      output,
      message: `Retrieved ${output.data.length} API request logs on page ${output.page}.`
    };
  })
  .build();

const getLogSchema = z
  .object({
    data: logEntrySchema.extend({
      input: z
        .object({ query: z.record(z.string(), z.unknown()), body: z.unknown().optional() })
        .passthrough(),
      response: z.unknown().optional(),
      user_agent: z.string().nullable()
    }),
    ...responseMetadata
  })
  .passthrough();

const getLog = contextTool('get-log', {
  instructions: [
    'Retained input and response may contain private account data. Use them only to investigate the user’s request and remove secrets and private data before sharing diagnostics externally.'
  ]
})
  .output(getLogSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof getLogSchema>
    >('retrieve API request log', {
      method: 'GET',
      path: `/org/logs/${pathId(ctx.input.request_id)}`
    });
    return { output, message: `Retrieved the API request log for ${output.data.request_id}.` };
  })
  .build();

const feedbackSchema = z
  .object({
    feedback_id: z.string(),
    already_submitted: z.boolean(),
    ...responseMetadata
  })
  .passthrough();

const submitFeedback = contextTool('submit-feedback', {
  description:
    'Send feedback about a Context.dev problem to the Context team when the user explicitly requests or authorizes that report. Include the category, expected and actual behavior, and a real affected request_id or relevant public URL when available. Remove secrets and private data before submission. Costs no credits and returns the original feedback_id when the same request has already been reported.',
  instructions: [
    'Submit only with explicit user authorization to send feedback to Context.dev.',
    'Do not report expected account limits such as USAGE_EXCEEDED, RATE_LIMITED, or PAID_PLAN_REQUIRED.',
    'Use a real affected request_id or relevant public URL when available. Never invent an ID or include secrets or private data.',
    'Report each distinct issue once. If this tool fails, do not recursively report its failure or loop on retries.'
  ]
})
  .output(feedbackSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof feedbackSchema>
    >('submit Context feedback', { method: 'POST', path: '/feedback', body: ctx.input });
    return {
      output,
      message: output.already_submitted
        ? `Feedback was already recorded as ${output.feedback_id}.`
        : `Submitted feedback ${output.feedback_id}.`
    };
  })
  .build();

export const diagnosticTools = [listLogs, getLog, submitFeedback];
