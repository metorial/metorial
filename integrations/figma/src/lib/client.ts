import { createAxios } from 'slates';

export class FigmaClient {
  private api: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.api = createAxios({
      baseURL: 'https://api.figma.com',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Figma-Token': token
      }
    });
  }

  // ── Users ──

  async getMe(): Promise<any> {
    let response = await this.api.get('/v1/me');
    return response.data;
  }

  // ── Files ──

  async getFile(
    fileKey: string,
    params?: {
      version?: string;
      ids?: string[];
      depth?: number;
      geometry?: string;
      pluginData?: string;
      branchData?: boolean;
    }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.version) queryParams.version = params.version;
    if (params?.ids?.length) queryParams.ids = params.ids.join(',');
    if (params?.depth !== undefined) queryParams.depth = params.depth;
    if (params?.geometry) queryParams.geometry = params.geometry;
    if (params?.pluginData) queryParams.plugin_data = params.pluginData;
    if (params?.branchData) queryParams.branch_data = params.branchData;

    let response = await this.api.get(`/v1/files/${fileKey}`, { params: queryParams });
    return response.data;
  }

  async getFileNodes(
    fileKey: string,
    nodeIds: string[],
    params?: {
      version?: string;
      depth?: number;
      geometry?: string;
      pluginData?: string;
    }
  ): Promise<any> {
    let queryParams: Record<string, any> = {
      ids: nodeIds.join(',')
    };
    if (params?.version) queryParams.version = params.version;
    if (params?.depth !== undefined) queryParams.depth = params.depth;
    if (params?.geometry) queryParams.geometry = params.geometry;
    if (params?.pluginData) queryParams.plugin_data = params.pluginData;

    let response = await this.api.get(`/v1/files/${fileKey}/nodes`, { params: queryParams });
    return response.data;
  }

  // ── Images ──

  async getImages(
    fileKey: string,
    params: {
      ids: string[];
      scale?: number;
      format?: 'jpg' | 'png' | 'svg' | 'pdf';
      svgOutlineText?: boolean;
      svgIncludeId?: boolean;
      svgIncludeNodeId?: boolean;
      svgSimplifyStroke?: boolean;
      contentsOnly?: boolean;
      useAbsoluteBounds?: boolean;
    }
  ): Promise<any> {
    let queryParams: Record<string, any> = {
      ids: params.ids.join(',')
    };
    if (params.scale !== undefined) queryParams.scale = params.scale;
    if (params.format) queryParams.format = params.format;
    if (params.svgOutlineText !== undefined)
      queryParams.svg_outline_text = params.svgOutlineText;
    if (params.svgIncludeId !== undefined) queryParams.svg_include_id = params.svgIncludeId;
    if (params.svgIncludeNodeId !== undefined)
      queryParams.svg_include_node_id = params.svgIncludeNodeId;
    if (params.svgSimplifyStroke !== undefined)
      queryParams.svg_simplify_stroke = params.svgSimplifyStroke;
    if (params.contentsOnly !== undefined) queryParams.contents_only = params.contentsOnly;
    if (params.useAbsoluteBounds !== undefined)
      queryParams.use_absolute_bounds = params.useAbsoluteBounds;

    let response = await this.api.get(`/v1/images/${fileKey}`, { params: queryParams });
    return response.data;
  }

  async getImageFills(fileKey: string): Promise<any> {
    let response = await this.api.get(`/v1/files/${fileKey}/images`);
    return response.data;
  }

  // ── Comments ──

  async getComments(
    fileKey: string,
    params?: {
      asMd?: boolean;
    }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.asMd !== undefined) queryParams.as_md = params.asMd;

    let response = await this.api.get(`/v1/files/${fileKey}/comments`, {
      params: queryParams
    });
    return response.data;
  }

  async postComment(
    fileKey: string,
    params: {
      message: string;
      commentId?: string;
      clientMeta?:
        | { x: number; y: number }
        | { nodeId: string; nodeOffset: { x: number; y: number } };
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      message: params.message
    };
    if (params.commentId) body.comment_id = params.commentId;
    if (params.clientMeta) body.client_meta = params.clientMeta;

    let response = await this.api.post(`/v1/files/${fileKey}/comments`, body);
    return response.data;
  }

  async deleteComment(fileKey: string, commentId: string): Promise<void> {
    await this.api.delete(`/v1/files/${fileKey}/comments/${commentId}`);
  }

  async getCommentReactions(
    fileKey: string,
    commentId: string,
    params?: {
      cursor?: string;
    }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;

    let response = await this.api.get(`/v1/files/${fileKey}/comments/${commentId}/reactions`, {
      params: queryParams
    });
    return response.data;
  }

  async postCommentReaction(fileKey: string, commentId: string, emoji: string): Promise<any> {
    let response = await this.api.post(
      `/v1/files/${fileKey}/comments/${commentId}/reactions`,
      { emoji }
    );
    return response.data;
  }

  async deleteCommentReaction(
    fileKey: string,
    commentId: string,
    emoji: string
  ): Promise<void> {
    await this.api.delete(`/v1/files/${fileKey}/comments/${commentId}/reactions`, {
      params: { emoji }
    });
  }

  // ── Versions ──

  async getFileVersions(
    fileKey: string,
    params?: {
      pageSize?: number;
      before?: string;
      after?: string;
    }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.pageSize) queryParams.page_size = params.pageSize;
    if (params?.before) queryParams.before = params.before;
    if (params?.after) queryParams.after = params.after;

    let response = await this.api.get(`/v1/files/${fileKey}/versions`, {
      params: queryParams
    });
    return response.data;
  }

  // ── Projects & Teams ──

  async getTeamProjects(teamId: string): Promise<any> {
    let response = await this.api.get(`/v1/teams/${teamId}/projects`);
    return response.data;
  }

  async getProjectFiles(
    projectId: string,
    params?: {
      branchData?: boolean;
    }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.branchData) queryParams.branch_data = params.branchData;

    let response = await this.api.get(`/v1/projects/${projectId}/files`, {
      params: queryParams
    });
    return response.data;
  }

  // ── Components & Styles ──

  async getTeamComponents(
    teamId: string,
    params?: {
      pageSize?: number;
      after?: number;
      before?: number;
    }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.pageSize) queryParams.page_size = params.pageSize;
    if (params?.after) queryParams.after = params.after;
    if (params?.before) queryParams.before = params.before;

    let response = await this.api.get(`/v1/teams/${teamId}/components`, {
      params: queryParams
    });
    return response.data;
  }

  async getFileComponents(fileKey: string): Promise<any> {
    let response = await this.api.get(`/v1/files/${fileKey}/components`);
    return response.data;
  }

  async getComponent(componentKey: string): Promise<any> {
    let response = await this.api.get(`/v1/components/${componentKey}`);
    return response.data;
  }

  async getTeamComponentSets(
    teamId: string,
    params?: {
      pageSize?: number;
      after?: number;
      before?: number;
    }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.pageSize) queryParams.page_size = params.pageSize;
    if (params?.after) queryParams.after = params.after;
    if (params?.before) queryParams.before = params.before;

    let response = await this.api.get(`/v1/teams/${teamId}/component_sets`, {
      params: queryParams
    });
    return response.data;
  }

  async getFileComponentSets(fileKey: string): Promise<any> {
    let response = await this.api.get(`/v1/files/${fileKey}/component_sets`);
    return response.data;
  }

  async getTeamStyles(
    teamId: string,
    params?: {
      pageSize?: number;
      after?: number;
      before?: number;
    }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.pageSize) queryParams.page_size = params.pageSize;
    if (params?.after) queryParams.after = params.after;
    if (params?.before) queryParams.before = params.before;

    let response = await this.api.get(`/v1/teams/${teamId}/styles`, { params: queryParams });
    return response.data;
  }

  async getFileStyles(fileKey: string): Promise<any> {
    let response = await this.api.get(`/v1/files/${fileKey}/styles`);
    return response.data;
  }

  async getStyle(styleKey: string): Promise<any> {
    let response = await this.api.get(`/v1/styles/${styleKey}`);
    return response.data;
  }

  // ── Variables (Enterprise) ──

  async getLocalVariables(fileKey: string): Promise<any> {
    let response = await this.api.get(`/v1/files/${fileKey}/variables/local`);
    return response.data;
  }

  async getPublishedVariables(fileKey: string): Promise<any> {
    let response = await this.api.get(`/v1/files/${fileKey}/variables/published`);
    return response.data;
  }

  async postVariables(
    fileKey: string,
    body: {
      variableCollections?: any[];
      variables?: any[];
      variableModes?: any[];
    }
  ): Promise<any> {
    let response = await this.api.post(`/v1/files/${fileKey}/variables`, body);
    return response.data;
  }

  // ── Dev Resources ──

  async getDevResources(
    fileKey: string,
    params?: {
      nodeId?: string;
    }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.nodeId) queryParams.node_ids = params.nodeId;

    let response = await this.api.get(`/v1/files/${fileKey}/dev_resources`, {
      params: queryParams
    });
    return response.data;
  }

  async createDevResources(
    devResources: {
      fileKey: string;
      nodeId: string;
      name: string;
      url: string;
    }[]
  ): Promise<any> {
    let response = await this.api.post('/v1/dev_resources', {
      dev_resources: devResources.map(r => ({
        file_key: r.fileKey,
        node_id: r.nodeId,
        name: r.name,
        url: r.url
      }))
    });
    return response.data;
  }

  async updateDevResource(
    devResourceId: string,
    params: {
      name?: string;
      url?: string;
    }
  ): Promise<any> {
    let response = await this.api.put('/v1/dev_resources', {
      dev_resources: [
        {
          id: devResourceId,
          name: params.name,
          url: params.url
        }
      ]
    });
    return response.data;
  }

  async deleteDevResource(fileKey: string, devResourceId: string): Promise<void> {
    await this.api.delete(`/v1/files/${fileKey}/dev_resources/${devResourceId}`);
  }

  // ── Webhooks ──

  async getTeamWebhooks(teamId: string): Promise<any> {
    let response = await this.api.get('/v2/webhooks', {
      params: {
        context: 'team',
        context_id: teamId
      }
    });
    return response.data;
  }

  async createWebhook(params: {
    eventType: string;
    teamId: string;
    endpoint: string;
    passcode: string;
    description?: string;
  }): Promise<any> {
    let response = await this.api.post('/v2/webhooks', {
      event_type: params.eventType,
      context: 'team',
      context_id: params.teamId,
      endpoint: params.endpoint,
      passcode: params.passcode,
      description: params.description
    });
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    params: {
      eventType?: string;
      endpoint?: string;
      passcode?: string;
      description?: string;
      status?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.eventType) body.event_type = params.eventType;
    if (params.endpoint) body.endpoint = params.endpoint;
    if (params.passcode) body.passcode = params.passcode;
    if (params.description) body.description = params.description;
    if (params.status) body.status = params.status;

    let response = await this.api.put(`/v2/webhooks/${webhookId}`, body);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    let response = await this.api.delete(`/v2/webhooks/${webhookId}`);
    return response.data;
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.api.get(`/v2/webhooks/${webhookId}`);
    return response.data;
  }

  async getWebhookRequests(webhookId: string): Promise<any> {
    let response = await this.api.get(`/v2/webhooks/${webhookId}/requests`);
    return response.data;
  }
}
