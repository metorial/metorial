import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  requestAxiosData
} from 'slates';

let codegenAxios = createAxios({ baseURL: 'https://codegen.plasmic.app/api/v1' });
let studioAxios = createAxios({ baseURL: 'https://studio.plasmic.app/api/v1' });
let projectError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Plasmic',
    reason: 'plasmic_project_api_error',
    operation
  });

let tokenTypes: Record<string, string> = {
  color: 'Color',
  spacing: 'Spacing',
  opacity: 'Opacity',
  lineheight: 'LineHeight',
  fontfamily: 'FontFamily',
  fontsize: 'FontSize',
  boxshadow: 'BoxShadow'
};

export class ProjectClient {
  private projectId: string;
  private projectToken?: string;
  private projectSecretToken?: string;

  constructor(config: {
    projectId: string;
    projectToken?: string;
    projectSecretToken?: string;
  }) {
    this.projectId = config.projectId;
    this.projectToken = config.projectToken;
    this.projectSecretToken = config.projectSecretToken;
  }

  private get readHeaders() {
    let token = this.projectToken || this.projectSecretToken;
    if (!token) {
      throw createApiServiceError('A project token is required for read operations');
    }
    return { 'x-plasmic-api-project-tokens': `${this.projectId}:${token}` };
  }

  private get writeHeaders() {
    if (!this.projectSecretToken) {
      throw createApiServiceError('Project secret token is required for write operations');
    }
    return {
      'x-plasmic-api-project-tokens': `${this.projectId}:${this.projectSecretToken}`,
      'Content-Type': 'application/json'
    };
  }

  private getProjectSegment(mode: 'preview' | 'published' | 'versioned', version?: string) {
    if (mode === 'versioned' && !version) {
      throw createApiServiceError('Provide a version when using versioned mode');
    }
    if (mode !== 'versioned' && version) {
      throw createApiServiceError('Use versioned mode to select a specific version');
    }
    return encodeURIComponent(
      mode === 'versioned' ? `${this.projectId}@${version}` : this.projectId
    );
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
    let projectSegment = this.getProjectSegment(params.mode, params.version);
    if (params.maxAge !== undefined && !params.prepass) {
      throw createApiServiceError('Enable prepass to use maxAge');
    }
    let result = await requestAxiosData(
      'render component',
      () =>
        codegenAxios.get<{ html: string }>(
          `/loader/html/${params.mode}/${projectSegment}/${encodeURIComponent(params.componentName)}`,
          {
            headers: this.readHeaders,
            params: {
              hydrate: params.hydrate ? '1' : undefined,
              embedHydrate: params.embedHydrate ? '1' : undefined,
              prepass: params.prepass ? '1' : undefined,
              maxAge: params.maxAge,
              componentProps: params.componentProps
                ? JSON.stringify(params.componentProps)
                : undefined,
              globalVariants: params.globalVariants
                ? JSON.stringify(params.globalVariants)
                : undefined
            }
          }
        ),
      projectError
    );
    if (typeof result.html !== 'string') {
      throw createApiServiceError('Plasmic did not return rendered HTML');
    }
    return { html: result.html };
  }

  async getProjectModel(params: {
    mode: 'preview' | 'published' | 'versioned';
    version?: string;
  }): Promise<Record<string, unknown>> {
    let projectSegment = this.getProjectSegment(params.mode, params.version);
    return requestAxiosData(
      'get project model',
      () =>
        codegenAxios.get<Record<string, unknown>>(
          `/loader/repr-v3/${params.mode}/${projectSegment}`,
          {
            headers: this.readHeaders
          }
        ),
      projectError
    );
  }

  async updateProject(params: {
    components?: Array<{
      name: string;
      uuid?: string;
      path?: string;
      isPage?: boolean;
      tplTree?: Record<string, unknown>;
    }>;
    tokens?: Array<{ name: string; type: string; value: string }>;
  }): Promise<Record<string, unknown>> {
    if (!params.components?.length && !params.tokens?.length) {
      throw createApiServiceError('Provide at least one component or design token to update');
    }
    let updateComponents = params.components?.map(component => {
      if (!component.tplTree) {
        throw createApiServiceError(
          `Provide tplTree for component "${component.name}" using Write API element types`
        );
      }
      if (component.uuid) {
        return { byUuid: component.uuid, body: component.tplTree };
      }
      if (component.isPage === true && !component.path) {
        throw createApiServiceError(`Provide a path for page "${component.name}"`);
      }
      if (component.isPage === false && component.path) {
        throw createApiServiceError(
          `A path makes "${component.name}" a page; omit the path or set isPage to true`
        );
      }
      return {
        name: component.name,
        path: component.path,
        body: component.tplTree
      };
    });
    let tokens = params.tokens?.map(token => {
      let type = tokenTypes[token.type.toLowerCase().replace(/[-_\s]/g, '')];
      if (!type) {
        throw createApiServiceError(
          `Unsupported token type "${token.type}". Use Color, Spacing, Opacity, LineHeight, FontFamily, FontSize, or BoxShadow`
        );
      }
      return { ...token, type };
    });
    return requestAxiosData(
      'update project',
      () =>
        studioAxios.post<Record<string, unknown>>(
          `/projects/${encodeURIComponent(this.projectId)}`,
          { updateComponents, tokens },
          { headers: this.writeHeaders }
        ),
      projectError
    );
  }
}
