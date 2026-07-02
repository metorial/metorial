import { createAxios } from 'slates';

let codegenAxios = createAxios({
  baseURL: 'https://codegen.plasmic.app/api/v1'
});

let studioAxios = createAxios({
  baseURL: 'https://studio.plasmic.app/api/v1'
});

export class ProjectClient {
  private projectId: string;
  private projectToken: string;
  private projectSecretToken?: string;

  constructor(config: {
    projectId: string;
    projectToken: string;
    projectSecretToken?: string;
  }) {
    this.projectId = config.projectId;
    this.projectToken = config.projectToken;
    this.projectSecretToken = config.projectSecretToken;
  }

  private get readHeaders() {
    return {
      'x-plasmic-api-project-tokens': `${this.projectId}:${this.projectToken}`
    };
  }

  private get writeHeaders() {
    if (!this.projectSecretToken) {
      throw new Error('Project secret token is required for write operations');
    }
    return {
      'x-plasmic-api-project-tokens': `${this.projectId}:${this.projectSecretToken}`,
      'Content-Type': 'application/json'
    };
  }

  async renderComponent(params: {
    componentName: string;
    mode: 'preview' | 'published' | 'versioned';
    version?: string;
    hydrate?: boolean;
    embedHydrate?: boolean;
    prepass?: boolean;
    maxAge?: number;
    componentProps?: Record<string, unknown>;
    globalVariants?: Array<{ name: string; value: string }>;
  }): Promise<{ html: string }> {
    let projectSegment =
      params.mode === 'versioned' && params.version
        ? `${this.projectId}@${params.version}`
        : this.projectId;

    let queryParams: Record<string, string> = {};
    if (params.hydrate) queryParams.hydrate = '1';
    if (params.embedHydrate) queryParams.embedHydrate = '1';
    if (params.prepass) queryParams.prepass = '1';
    if (params.maxAge !== undefined) queryParams.maxAge = String(params.maxAge);
    if (params.componentProps) {
      queryParams.componentProps = JSON.stringify(params.componentProps);
    }
    if (params.globalVariants) {
      queryParams.globalVariants = JSON.stringify(params.globalVariants);
    }

    let response = await codegenAxios.get(
      `/loader/html/${params.mode}/${projectSegment}/${encodeURIComponent(params.componentName)}`,
      {
        headers: this.readHeaders,
        params: queryParams
      }
    );

    return { html: response.data };
  }

  async getProjectModel(params: {
    mode: 'preview' | 'published' | 'versioned';
    version?: string;
  }): Promise<Record<string, unknown>> {
    let projectSegment =
      params.mode === 'versioned' && params.version
        ? `${this.projectId}@${params.version}`
        : this.projectId;

    let response = await codegenAxios.get(`/loader/repr-v3/${params.mode}/${projectSegment}`, {
      headers: this.readHeaders
    });

    return response.data;
  }

  async updateProject(body: {
    upsertComponents?: Array<{
      name: string;
      uuid?: string;
      path?: string;
      isPage?: boolean;
      tplTree?: Record<string, unknown>;
    }>;
    upsertTokens?: Array<{
      name: string;
      type: string;
      value: string;
    }>;
  }): Promise<Record<string, unknown>> {
    let response = await studioAxios.post(`/projects/${this.projectId}`, body, {
      headers: this.writeHeaders
    });

    return response.data;
  }
}
