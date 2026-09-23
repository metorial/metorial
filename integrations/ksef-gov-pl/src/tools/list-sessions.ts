import { SlateTool } from 'slates';
import { z } from 'zod';
import { KsefClient } from '../lib/client';
import { ksefValidationError } from '../lib/errors';
import { spec } from '../spec';

const sessionsQueryResponseSchema = z.object({
  continuationToken: z.string().nullish(),
  sessions: z.array(
    z.object({
      referenceNumber: z.string(),
      status: z.object({
        code: z.number().int(),
        description: z.string(),
        details: z.array(z.string()).nullish()
      }),
      dateCreated: z.string(),
      dateUpdated: z.string(),
      validUntil: z.string().nullish(),
      totalInvoiceCount: z.number().int(),
      successfulInvoiceCount: z.number().int(),
      failedInvoiceCount: z.number().int()
    })
  )
});

const sessionSchema = z.object({
  sessionReferenceNumber: z
    .string()
    .describe('Session reference number for status and receipt tools.'),
  status: z
    .object({
      code: z.number().int().describe('Original KSeF session status code.'),
      description: z.string().describe('Original KSeF session status description.'),
      details: z
        .array(z.string())
        .nullable()
        .describe('Additional KSeF status details, when available.')
    })
    .describe('Original KSeF status, including codes not yet known to this integration.'),
  dateCreated: z.string().describe('Session creation date and time.'),
  dateUpdated: z.string().describe('Date and time of the latest session activity.'),
  validUntil: z
    .string()
    .nullable()
    .describe('Date and time when an open online session expires.'),
  totalInvoiceCount: z
    .number()
    .int()
    .describe('Invoices submitted or still processing in the session.'),
  successfulInvoiceCount: z.number().int().describe('Invoices processed successfully.'),
  failedInvoiceCount: z.number().int().describe('Invoices rejected during processing.')
});

export const listSessionsTool = SlateTool.create(spec, {
  name: 'List Sessions',
  key: 'list_sessions',
  description:
    'List online invoice submission sessions. Filter by reference, dates, or status, then use the continuation token to retrieve more results.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageSize: z
        .number()
        .int()
        .min(10)
        .max(1000)
        .optional()
        .describe('Number of sessions per page, from 10 to 1000. Defaults to 10.'),
      sessionReferenceNumber: z
        .string()
        .min(1)
        .optional()
        .describe('Return the session with this reference number.'),
      dateCreatedFrom: z
        .string()
        .datetime({ offset: true })
        .optional()
        .describe('Created on or after this ISO 8601 date and time.'),
      dateCreatedTo: z
        .string()
        .datetime({ offset: true })
        .optional()
        .describe('Created on or before this ISO 8601 date and time.'),
      dateClosedFrom: z
        .string()
        .datetime({ offset: true })
        .optional()
        .describe('Closed on or after this ISO 8601 date and time.'),
      dateClosedTo: z
        .string()
        .datetime({ offset: true })
        .optional()
        .describe('Closed on or before this ISO 8601 date and time.'),
      dateModifiedFrom: z
        .string()
        .datetime({ offset: true })
        .optional()
        .describe('Last activity on or after this ISO 8601 date and time.'),
      dateModifiedTo: z
        .string()
        .datetime({ offset: true })
        .optional()
        .describe('Last activity on or before this ISO 8601 date and time.'),
      statuses: z
        .array(z.enum(['InProgress', 'Succeeded', 'Failed', 'Cancelled']))
        .min(1)
        .optional()
        .describe('Filter by one or more KSeF session states.'),
      continuationToken: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Token returned by a previous list_sessions result. Keep the same filters when paging.'
        )
    })
  )
  .output(
    z.object({
      sessions: z.array(sessionSchema).describe('Online submission sessions, newest first.'),
      continuationToken: z
        .string()
        .nullable()
        .describe('Pass to the next call to retrieve more sessions.'),
      hasMore: z.boolean().describe('Whether another page of matching sessions is available.')
    })
  )
  .handleInvocation(async ctx => {
    const client = new KsefClient(ctx.auth);
    const rawResponse = await client.request<unknown>('list sessions', 'GET', '/sessions', {
      query: {
        sessionType: 'Online',
        pageSize: ctx.input.pageSize ?? 10,
        referenceNumber: ctx.input.sessionReferenceNumber,
        dateCreatedFrom: ctx.input.dateCreatedFrom,
        dateCreatedTo: ctx.input.dateCreatedTo,
        dateClosedFrom: ctx.input.dateClosedFrom,
        dateClosedTo: ctx.input.dateClosedTo,
        dateModifiedFrom: ctx.input.dateModifiedFrom,
        dateModifiedTo: ctx.input.dateModifiedTo,
        statuses: ctx.input.statuses
      },
      headers: ctx.input.continuationToken
        ? { 'x-continuation-token': ctx.input.continuationToken }
        : undefined,
      safeRead: true
    });
    const parsedResponse = sessionsQueryResponseSchema.safeParse(rawResponse);
    if (!parsedResponse.success) {
      throw ksefValidationError('KSeF returned an invalid sessions response.');
    }
    const response = parsedResponse.data;

    const continuationToken = response.continuationToken || null;
    const sessions = response.sessions.map(session => ({
      sessionReferenceNumber: session.referenceNumber,
      status: {
        code: session.status.code,
        description: session.status.description,
        details: session.status.details ?? null
      },
      dateCreated: session.dateCreated,
      dateUpdated: session.dateUpdated,
      validUntil: session.validUntil ?? null,
      totalInvoiceCount: session.totalInvoiceCount,
      successfulInvoiceCount: session.successfulInvoiceCount,
      failedInvoiceCount: session.failedInvoiceCount
    }));

    return {
      output: { sessions, continuationToken, hasMore: continuationToken !== null },
      message: `Found ${sessions.length} online submission session(s)${continuationToken ? '; more results are available' : ''}.`
    };
  })
  .build();
