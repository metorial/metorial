import { cursorPageInfoFromLink, GitHubClient, type GitHubClientConfig } from './client';

type GitHubRecord = Record<string, any>;

let encode = (value: string | number) => encodeURIComponent(String(value));

export class GitHubSecurityApi {
  private client: GitHubClient;

  constructor(auth: GitHubClientConfig) {
    this.client = new GitHubClient(auth);
  }

  private async read<T>(
    path: string,
    params: Record<string, unknown> | undefined,
    operation: string,
    reason: string
  ): Promise<T> {
    return await this.client.requestRest<T>({
      method: 'GET',
      path,
      operation,
      reason,
      query: params
    });
  }

  getCodeScanningAlert(owner: string, repo: string, alertNumber: number) {
    return this.read<GitHubRecord>(
      `/repos/${encode(owner)}/${encode(repo)}/code-scanning/alerts/${encode(alertNumber)}`,
      undefined,
      'get code scanning alert',
      'github_get_code_scanning_alert_failed'
    );
  }

  listCodeScanningAlerts(
    owner: string,
    repo: string,
    params: {
      state?: string;
      ref?: string;
      severity?: string;
      toolName?: string;
      perPage?: number;
      page?: number;
    }
  ) {
    return this.read<GitHubRecord[]>(
      `/repos/${encode(owner)}/${encode(repo)}/code-scanning/alerts`,
      {
        state: params.state,
        ref: params.ref,
        severity: params.severity,
        tool_name: params.toolName,
        per_page: params.perPage,
        page: params.page
      },
      'list code scanning alerts',
      'github_list_code_scanning_alerts_failed'
    );
  }

  getDependabotAlert(owner: string, repo: string, alertNumber: number) {
    return this.read<GitHubRecord>(
      `/repos/${encode(owner)}/${encode(repo)}/dependabot/alerts/${encode(alertNumber)}`,
      undefined,
      'get Dependabot alert',
      'github_get_dependabot_alert_failed'
    );
  }

  async listDependabotAlerts(
    owner: string,
    repo: string,
    params: {
      state?: string;
      severity?: string;
      after?: string;
      perPage?: number;
    }
  ) {
    let response = await this.client.requestRestWithMetadata<GitHubRecord[]>({
      method: 'GET',
      path: `/repos/${encode(owner)}/${encode(repo)}/dependabot/alerts`,
      operation: 'list Dependabot alerts',
      reason: 'github_list_dependabot_alerts_failed',
      query: {
        state: params.state,
        severity: params.severity,
        after: params.after,
        per_page: params.perPage
      }
    });
    return {
      alerts: response.data,
      pageInfo: cursorPageInfoFromLink(response.linkHeader)
    };
  }

  getSecretScanningAlert(owner: string, repo: string, alertNumber: number) {
    return this.read<GitHubRecord>(
      `/repos/${encode(owner)}/${encode(repo)}/secret-scanning/alerts/${encode(alertNumber)}`,
      undefined,
      'get secret scanning alert',
      'github_get_secret_scanning_alert_failed'
    );
  }

  listSecretScanningAlerts(
    owner: string,
    repo: string,
    params: {
      state?: string;
      secretType?: string;
      resolution?: string;
      perPage?: number;
      page?: number;
    }
  ) {
    return this.read<GitHubRecord[]>(
      `/repos/${encode(owner)}/${encode(repo)}/secret-scanning/alerts`,
      {
        state: params.state,
        secret_type: params.secretType,
        resolution: params.resolution,
        per_page: params.perPage,
        page: params.page
      },
      'list secret scanning alerts',
      'github_list_secret_scanning_alerts_failed'
    );
  }

  listRepositorySecurityAdvisories(
    owner: string,
    repo: string,
    params: { direction?: string; sort?: string; state?: string }
  ) {
    return this.read<GitHubRecord[]>(
      `/repos/${encode(owner)}/${encode(repo)}/security-advisories`,
      params,
      'list repository security advisories',
      'github_list_repository_security_advisories_failed'
    );
  }

  listOrganizationRepositorySecurityAdvisories(
    org: string,
    params: { direction?: string; sort?: string; state?: string }
  ) {
    return this.read<GitHubRecord[]>(
      `/orgs/${encode(org)}/security-advisories`,
      params,
      'list organization repository security advisories',
      'github_list_org_repository_security_advisories_failed'
    );
  }

  getCodeQualityFinding(owner: string, repo: string, findingNumber: number) {
    return this.read<GitHubRecord>(
      `/repos/${encode(owner)}/${encode(repo)}/code-quality/findings/${encode(findingNumber)}`,
      undefined,
      'get code quality finding',
      'github_get_code_quality_finding_failed'
    );
  }
}
