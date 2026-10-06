import { createAxios } from 'slates';
import { invalid, protect, repository, token, upstream } from './contracts';

export type ApiConfiguration = {
  repositoryName: string;
  protectedTokens?: string[];
};
export class PrismicTransport {
  readonly repositoryName: string;
  readonly credentials: string[];
  constructor(
    configuration: ApiConfiguration,
    private readonly host: string,
    private readonly credential?: string
  ) {
    this.repositoryName = repository(configuration.repositoryName);
    if (credential) token(credential);
    this.credentials = [
      ...new Set([
        ...(configuration.protectedTokens ?? []),
        ...(credential ? [credential] : [])
      ])
    ];
  }
  async request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options: Parameters<ReturnType<typeof createAxios>['request']>[0] = {}
  ) {
    const client = createAxios({
      baseURL: this.host,
      timeout: 30000,
      maxRedirects: 0,
      headers: this.credential
        ? { Authorization: `Bearer ${this.credential}`, repository: this.repositoryName }
        : undefined
    });
    if (
      this.host.endsWith('.cdn.prismic.io/api/v2') &&
      client.getUri({ ...options, url: path }).length > 2048
    )
      invalid(
        'Content API request URLs must fit within 2048 characters. Reduce the query or requested fields.'
      );
    try {
      const response = await client.request<unknown>({ ...options, method, url: path });
      return { status: response.status, data: response.data };
    } catch (error) {
      throw upstream(error);
    }
  }
  check(value: unknown) {
    protect(value, this.credentials);
  }
}
