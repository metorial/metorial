import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://www.api.faceup.com'
});

export class FaceUpClient {
  private token: string;
  private region: string;

  constructor(config: { token: string; region: string }) {
    this.token = config.token;
    this.region = config.region;
  }

  private async graphql<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    let response = await http.post(
      '/graphql',
      {
        query,
        variables
      },
      {
        headers: {
          Authorization: this.token,
          'X-Region': this.region,
          'Content-Type': 'application/json'
        }
      }
    );

    let body = response.data;

    if (body.errors && body.errors.length > 0) {
      let errorMessages = body.errors.map((e: any) => e.message).join('; ');
      throw new Error(`FaceUp GraphQL error: ${errorMessages}`);
    }

    return body.data as T;
  }

  async getReportStatistics(
    dateFrom?: string
  ): Promise<{ reportCountByMonth: Array<{ month: string; count: number }> }> {
    let variables: Record<string, any> = {};
    let dateArg = '';

    if (dateFrom) {
      dateArg = '(dateFrom: $dateFrom)';
      variables.dateFrom = dateFrom;
    }

    let variableDef = dateFrom ? '($dateFrom: String)' : '';

    let query = `
      query Statistics${variableDef} {
        publicStatistics${dateArg} {
          reportCountByMonth
        }
      }
    `;

    let data = await this.graphql<{ publicStatistics: { reportCountByMonth: any } }>(
      query,
      variables
    );
    return data.publicStatistics;
  }

  async getReports(
    first?: number,
    after?: string
  ): Promise<{
    reports: Array<{
      reportId: string;
      tag: string;
      origin: string;
      justification: string;
      priority: string | null;
      status: string;
      source: string;
      createdAt: string;
    }>;
    hasNextPage: boolean;
    endCursor: string | null;
  }> {
    let args: string[] = [];
    let variableDefs: string[] = [];
    let variables: Record<string, any> = {};

    if (first) {
      variableDefs.push('$first: Int');
      args.push('first: $first');
      variables.first = first;
    }

    if (after) {
      variableDefs.push('$after: String');
      args.push('after: $after');
      variables.after = after;
    }

    let variableDefStr = variableDefs.length > 0 ? `(${variableDefs.join(', ')})` : '';
    let argsStr = args.length > 0 ? `(${args.join(', ')})` : '';

    let query = `
      query Reports${variableDefStr} {
        reports${argsStr} {
          edges {
            node {
              id
              tag
              origin
              justification
              priority
              status
              source
              created_at
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    let data = await this.graphql<{
      reports: {
        edges: Array<{ node: any }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>(query, variables);

    let reports = data.reports.edges.map((edge: any) => ({
      reportId: edge.node.id,
      tag: edge.node.tag,
      origin: edge.node.origin,
      justification: edge.node.justification,
      priority: edge.node.priority,
      status: edge.node.status,
      source: edge.node.source,
      createdAt: edge.node.created_at
    }));

    return {
      reports,
      hasNextPage: data.reports.pageInfo.hasNextPage,
      endCursor: data.reports.pageInfo.endCursor
    };
  }

  async getReport(reportId: string): Promise<{
    reportId: string;
    tag: string;
    origin: string;
    justification: string;
    priority: string | null;
    status: string;
    source: string;
    createdAt: string;
  }> {
    let query = `
      query Report($reportId: ID!) {
        report(id: $reportId) {
          id
          tag
          origin
          justification
          priority
          status
          source
          created_at
        }
      }
    `;

    let data = await this.graphql<{ report: any }>(query, { reportId });

    return {
      reportId: data.report.id,
      tag: data.report.tag,
      origin: data.report.origin,
      justification: data.report.justification,
      priority: data.report.priority,
      status: data.report.status,
      source: data.report.source,
      createdAt: data.report.created_at
    };
  }
}
