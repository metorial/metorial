import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  createRocketadminClient,
  paginationFrom,
  records,
  requiredString,
  validatePagination
} from '../lib/client';
import { spec } from '../spec';

export let getAuditLogs = SlateTool.create(spec, {
  name: 'Get Audit Logs',
  key: 'get_audit_logs',
  description: `Retrieve activity logs for a database connection. Supports filtering by table name, user, and date range. Also supports fetching sign-in audit logs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().optional().describe('Connection ID for connection-level logs'),
      logType: z
        .enum(['connection', 'signin'])
        .default('connection')
        .describe('Type of audit log to retrieve'),
      companyId: z
        .string()
        .optional()
        .describe(
          'Company ID for sign-in logs; call get_my_company to discover it. Defaults to the signed-in company.'
        ),
      email: z.string().optional().describe('Filter by user email'),
      order: z.enum(['ASC', 'DESC']).optional().describe('Sort by creation time'),
      limit: z
        .number()
        .optional()
        .describe('Maximum connection log entries when not using pagination'),
      tableName: z.string().optional().describe('Filter logs by table name'),
      userId: z.string().optional().describe('Filter logs by user ID'),
      dateFrom: z.string().optional().describe('Start date filter (ISO 8601 format)'),
      dateTo: z.string().optional().describe('End date filter (ISO 8601 format)'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of log entries per page')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete provider response'),
      logs: z.array(z.record(z.string(), z.unknown())).describe('Audit log entries'),
      pagination: z
        .object({
          total: z.number().optional(),
          page: z.number().optional(),
          perPage: z.number().optional()
        })
        .optional()
        .describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = createRocketadminClient(ctx.auth, ctx.config);

    validatePagination(ctx.input.page, ctx.input.perPage);
    if (
      ctx.input.limit !== undefined &&
      (!Number.isSafeInteger(ctx.input.limit) || ctx.input.limit < 1)
    ) {
      throw createApiServiceError('limit must be a positive whole number.');
    }
    if (ctx.input.limit !== undefined && ctx.input.page !== undefined) {
      throw createApiServiceError('Use limit or page/perPage, not both.');
    }
    if (ctx.input.userId && ctx.input.email)
      throw createApiServiceError('Filter by userId or email, not both.');
    if (
      ctx.input.logType === 'signin' &&
      (ctx.input.tableName !== undefined || ctx.input.limit !== undefined)
    ) {
      throw createApiServiceError(
        'tableName and limit apply only to connection logs. Use page/perPage for sign-in logs.'
      );
    }
    for (let [name, value] of [
      ['dateFrom', ctx.input.dateFrom],
      ['dateTo', ctx.input.dateTo]
    ] as const) {
      if (value !== undefined && !Number.isFinite(Date.parse(value)))
        throw createApiServiceError(`${name} must be a valid ISO date or timestamp.`);
    }
    if (
      ctx.input.dateFrom &&
      ctx.input.dateTo &&
      Date.parse(ctx.input.dateFrom) > Date.parse(ctx.input.dateTo)
    ) {
      throw createApiServiceError('dateFrom must not be later than dateTo.');
    }
    let companyId = ctx.input.companyId;
    if (ctx.input.logType === 'signin' && !companyId) {
      companyId = requiredString((await client.getCompanyInfo()).id, 'company ID');
    }
    if (ctx.input.logType === 'connection' && !ctx.input.connectionId) {
      throw createApiServiceError(
        'connectionId is required for connection logs. Call list_connections to discover IDs.'
      );
    }
    let email = ctx.input.email;
    if (ctx.input.userId) {
      let users =
        ctx.input.logType === 'signin'
          ? await client.getUsersInCompany(requiredString(companyId, 'company ID'))
          : await client.getUsersInConnection(
              requiredString(ctx.input.connectionId, 'connection ID')
            );
      email = requiredString(
        users.find(user => user.id === ctx.input.userId)?.email,
        'email for this user ID'
      );
    }
    let params = {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      tableName: ctx.input.tableName,
      email,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      order: ctx.input.order,
      limit: ctx.input.limit
    };
    let result =
      ctx.input.logType === 'signin'
        ? await client.getSignInAuditLogs(requiredString(companyId, 'company ID'), params)
        : await client.getConnectionLogs(
            requiredString(ctx.input.connectionId, 'connection ID'),
            params
          );
    let logs = records(result.logs, 'audit logs');
    let pagination = paginationFrom(result.pagination);
    return {
      output: { logs, pagination, raw: result },
      message: `Retrieved **${logs.length}** ${ctx.input.logType} audit log entries.`
    };
  })
  .build();
