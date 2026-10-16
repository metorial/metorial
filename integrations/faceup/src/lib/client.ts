import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';
import {
  type Employee,
  parseFaceUpResponse,
  rawReportSchema,
  type StatisticsInput
} from './schemas';

let reportFields = 'id tag origin justification priority status source created_at';

let mapReport = (report: z.infer<typeof rawReportSchema>) => ({
  reportId: report.id,
  tag: report.tag,
  origin: report.origin,
  justification: report.justification,
  priority: report.priority,
  status: report.status,
  source: report.source,
  createdAt: report.created_at
});

let apiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'FaceUp',
    reason: 'faceup_api_error',
    operation,
    extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
    nestedKeys: ['errors', 'error', 'extensions'],
    extractUpstreamCode: (_failure, response) => {
      let body = response?.data;
      if (!isApiErrorRecord(body) || !Array.isArray(body.errors)) return undefined;
      for (let error of body.errors) {
        if (!isApiErrorRecord(error) || !isApiErrorRecord(error.extensions)) continue;
        let code = error.extensions.code;
        if (typeof code === 'string' || typeof code === 'number') return String(code);
      }
      return undefined;
    }
  });

export class FaceUpClient {
  private http;

  constructor(config: { token: string; region: string }) {
    if (!config.token?.trim() || !config.region?.trim()) {
      throw createApiServiceError(
        'FaceUp API key and data hosting region are required. Reconnect your account.',
        { reason: 'faceup_missing_credentials' }
      );
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://www.api.faceup.com',
      timeout: 30_000,
      authHeader: { value: config.token },
      headers: { 'X-Region': config.region },
      errorAdapter: error => apiError(error, 'request')
    });
  }

  private async graphql(
    operation: string,
    query: string,
    variables?: Record<string, unknown>
  ) {
    let response = await this.http.post<unknown>('/graphql', { query, variables });
    let body = response.data;
    if (!isApiErrorRecord(body)) {
      throw createApiServiceError(`FaceUp returned an invalid ${operation} response.`, {
        reason: 'faceup_invalid_response'
      });
    }
    if (Array.isArray(body.errors) && body.errors.length > 0) {
      throw apiError({ response: { status: response.status, data: body } }, operation);
    }
    if (body.errors !== undefined && !Array.isArray(body.errors)) {
      throw createApiServiceError('FaceUp returned an invalid GraphQL errors response.', {
        reason: 'faceup_invalid_response'
      });
    }
    if (!isApiErrorRecord(body.data)) {
      throw createApiServiceError(`FaceUp returned no data for ${operation}.`, {
        reason: 'faceup_invalid_response'
      });
    }
    return body.data;
  }

  async getReportStatistics(input: StatisticsInput = {}) {
    for (let key of ['dateFrom', 'dateTo'] as const) {
      let value = input[key];
      if (
        value !== undefined &&
        !z.iso.date().safeParse(value).success &&
        !z.iso.datetime({ offset: true }).safeParse(value).success
      ) {
        throw createApiServiceError(`${key} must be an ISO 8601 date or timestamp.`);
      }
    }
    if (
      input.dateFrom &&
      input.dateTo &&
      Date.parse(input.dateFrom) > Date.parse(input.dateTo)
    ) {
      throw createApiServiceError('dateFrom must be earlier than or equal to dateTo.');
    }
    // Public docs specify literal values but do not publish GraphQL enum type names.
    // Encode strings and use only schema-validated enum values in the query.
    let args: string[] = [];
    for (let key of ['dateFrom', 'dateTo', 'tag'] as const) {
      if (input[key] !== undefined) args.push(`${key}: ${JSON.stringify(input[key])}`);
    }
    for (let key of [
      'statuses',
      'creationOrigins',
      'justifications',
      'priorities',
      'sources',
      'closingReasons'
    ] as const) {
      if (input[key] !== undefined) args.push(`${key}: [${input[key].join(', ')}]`);
    }
    if (input.deadline !== undefined) args.push(`deadline: ${input.deadline}`);
    if (input.rating !== undefined) args.push(`rating: ${input.rating}`);
    let fields = ['reportCountByMonth', ...new Set(input.additionalMetrics ?? [])];
    let data = await this.graphql(
      'statistics query',
      `query Statistics { publicStatistics${args.length ? `(${args.join(', ')})` : ''} { ${fields.join(' ')} } }`
    );
    let statistics = parseFaceUpResponse(
      z.record(z.string(), z.unknown()),
      data.publicStatistics,
      'statistics'
    );
    for (let field of fields) {
      if (!Object.hasOwn(statistics, field) || statistics[field] === undefined) {
        throw createApiServiceError(`FaceUp statistics response is missing ${field}.`, {
          reason: 'faceup_invalid_response'
        });
      }
    }
    return statistics;
  }

  async getReports(first?: number, after?: string) {
    if (first !== undefined && (!Number.isSafeInteger(first) || first < 1)) {
      throw createApiServiceError('first must be a positive whole number.');
    }
    if (after !== undefined && !after.trim()) {
      throw createApiServiceError('after must be a nonempty endCursor from list_reports.');
    }
    let args: string[] = [];
    let variableDefs: string[] = [];
    let variables: Record<string, unknown> = {};
    if (first !== undefined) {
      variableDefs.push('$first: Int');
      args.push('first: $first');
      variables.first = first;
    }
    if (after !== undefined) {
      variableDefs.push('$after: String');
      args.push('after: $after');
      variables.after = after;
    }
    let data = await this.graphql(
      'reports query',
      `query Reports${variableDefs.length ? `(${variableDefs.join(', ')})` : ''} {
        reports${args.length ? `(${args.join(', ')})` : ''} {
          edges { node { ${reportFields} } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      variables
    );
    let page = parseFaceUpResponse(
      z.object({
        edges: z.array(z.object({ node: rawReportSchema })),
        pageInfo: z.object({
          hasNextPage: z.boolean(),
          endCursor: z.string().min(1).nullable()
        })
      }),
      data.reports,
      'reports'
    );
    if (page.pageInfo.hasNextPage && page.pageInfo.endCursor === null) {
      throw createApiServiceError('FaceUp returned another report page without a cursor.', {
        reason: 'faceup_invalid_response'
      });
    }
    return {
      reports: page.edges.map(edge => mapReport(edge.node)),
      hasNextPage: page.pageInfo.hasNextPage,
      endCursor: page.pageInfo.endCursor
    };
  }

  async getReport(reportId: string) {
    if (!reportId.trim()) {
      throw createApiServiceError('reportId must be a nonempty ID from list_reports.');
    }
    let data = await this.graphql(
      'report query',
      `query Report($reportId: ID!) { report(id: $reportId) { ${reportFields} } }`,
      { reportId }
    );
    if (data.report === null) {
      throw createApiServiceError('The FaceUp report was not found or is not accessible.', {
        reason: 'faceup_report_unavailable'
      });
    }
    return mapReport(parseFaceUpResponse(rawReportSchema, data.report, 'report'));
  }

  async syncEmployees(employees: Employee[]) {
    let data = await this.graphql(
      'employee sync',
      `mutation SyncEmployees($input: SyncEmployeesInput!) {
        syncEmployees(input: $input) { success }
      }`,
      { input: { employees } }
    );
    let result = parseFaceUpResponse(
      z.object({ success: z.boolean() }),
      data.syncEmployees,
      'employee sync'
    );
    if (!result.success) {
      throw createApiServiceError(
        'FaceUp did not confirm that the employee batch was synced.',
        {
          reason: 'faceup_sync_failed'
        }
      );
    }
    return result;
  }
}
