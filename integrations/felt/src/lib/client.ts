import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://felt.com/api/v2'
    });
    this.axios.defaults.headers.common.Authorization = `Bearer ${config.token}`;
  }

  // ── Maps ──────────────────────────────────────────────────────────────

  async createMap(params: {
    title?: string;
    description?: string;
    lat?: number;
    lon?: number;
    zoom?: number;
    basemap?: string;
    publicAccess?: string;
    layerUrls?: string[];
  }) {
    let body: Record<string, unknown> = {};
    if (params.title !== undefined) body.title = params.title;
    if (params.description !== undefined) body.description = params.description;
    if (params.lat !== undefined) body.lat = params.lat;
    if (params.lon !== undefined) body.lon = params.lon;
    if (params.zoom !== undefined) body.zoom = params.zoom;
    if (params.basemap !== undefined) body.basemap = params.basemap;
    if (params.publicAccess !== undefined) body.public_access = params.publicAccess;
    if (params.layerUrls !== undefined) body.layer_urls = params.layerUrls;

    let response = await this.axios.post('/maps', body);
    return response.data;
  }

  async getMap(mapId: string) {
    let response = await this.axios.get(`/maps/${mapId}`);
    return response.data;
  }

  async updateMap(
    mapId: string,
    params: {
      title?: string;
      description?: string;
      basemap?: string;
      publicAccess?: string;
      tableSettings?: {
        defaultTableLayerId?: string;
        viewersCanOpenTable?: boolean;
      };
      viewerPermissions?: {
        canDuplicateMap?: boolean;
        canExportData?: boolean;
        canSeeMapPresence?: boolean;
      };
    }
  ) {
    let body: Record<string, unknown> = {};
    if (params.title !== undefined) body.title = params.title;
    if (params.description !== undefined) body.description = params.description;
    if (params.basemap !== undefined) body.basemap = params.basemap;
    if (params.publicAccess !== undefined) body.public_access = params.publicAccess;
    if (params.tableSettings !== undefined) {
      let ts: Record<string, unknown> = {};
      if (params.tableSettings.defaultTableLayerId !== undefined)
        ts.default_table_layer_id = params.tableSettings.defaultTableLayerId;
      if (params.tableSettings.viewersCanOpenTable !== undefined)
        ts.viewers_can_open_table = params.tableSettings.viewersCanOpenTable;
      body.table_settings = ts;
    }
    if (params.viewerPermissions !== undefined) {
      let vp: Record<string, unknown> = {};
      if (params.viewerPermissions.canDuplicateMap !== undefined)
        vp.can_duplicate_map = params.viewerPermissions.canDuplicateMap;
      if (params.viewerPermissions.canExportData !== undefined)
        vp.can_export_data = params.viewerPermissions.canExportData;
      if (params.viewerPermissions.canSeeMapPresence !== undefined)
        vp.can_see_map_presence = params.viewerPermissions.canSeeMapPresence;
      body.viewer_permissions = vp;
    }

    let response = await this.axios.post(`/maps/${mapId}/update`, body);
    return response.data;
  }

  async deleteMap(mapId: string) {
    let response = await this.axios.delete(`/maps/${mapId}`);
    return response.data;
  }

  async moveMap(mapId: string, params: { projectId?: string; folderId?: string }) {
    let body: Record<string, unknown> = {};
    if (params.projectId !== undefined) body.project_id = params.projectId;
    if (params.folderId !== undefined) body.folder_id = params.folderId;

    let response = await this.axios.post(`/maps/${mapId}/move`, body);
    return response.data;
  }

  async duplicateMap(
    mapId: string,
    params?: { title?: string; destination?: { projectId?: string; folderId?: string } }
  ) {
    let body: Record<string, unknown> = {};
    if (params?.title !== undefined) body.title = params.title;
    if (params?.destination) {
      let dest: Record<string, unknown> = {};
      if (params.destination.projectId !== undefined)
        dest.project_id = params.destination.projectId;
      if (params.destination.folderId !== undefined)
        dest.folder_id = params.destination.folderId;
      body.destination = dest;
    }

    let response = await this.axios.post(`/maps/${mapId}/duplicate`, body);
    return response.data;
  }

  // ── Layers ────────────────────────────────────────────────────────────

  async listLayers(mapId: string) {
    let response = await this.axios.get(`/maps/${mapId}/layers`);
    return response.data;
  }

  async getLayer(mapId: string, layerId: string) {
    let response = await this.axios.get(`/maps/${mapId}/layers/${layerId}`);
    return response.data;
  }

  async updateLayers(
    mapId: string,
    layers: Array<{
      id: string;
      name?: string;
      caption?: string;
      layerGroupId?: string;
      legendDisplay?: string;
      legendVisibility?: string;
      ordering_key?: string;
      refreshPeriod?: string;
      subtitle?: string;
      metadata?: Record<string, unknown>;
    }>
  ) {
    let body = layers.map(l => {
      let item: Record<string, unknown> = { id: l.id };
      if (l.name !== undefined) item.name = l.name;
      if (l.caption !== undefined) item.caption = l.caption;
      if (l.layerGroupId !== undefined) item.layer_group_id = l.layerGroupId;
      if (l.legendDisplay !== undefined) item.legend_display = l.legendDisplay;
      if (l.legendVisibility !== undefined) item.legend_visibility = l.legendVisibility;
      if (l.ordering_key !== undefined) item.ordering_key = l.ordering_key;
      if (l.refreshPeriod !== undefined) item.refresh_period = l.refreshPeriod;
      if (l.subtitle !== undefined) item.subtitle = l.subtitle;
      if (l.metadata !== undefined) item.metadata = l.metadata;
      return item;
    });

    let response = await this.axios.post(`/maps/${mapId}/layers`, body);
    return response.data;
  }

  async deleteLayer(mapId: string, layerId: string) {
    let response = await this.axios.delete(`/maps/${mapId}/layers/${layerId}`);
    return response.data;
  }

  async updateLayerStyle(mapId: string, layerId: string, style: Record<string, unknown>) {
    let response = await this.axios.post(`/maps/${mapId}/layers/${layerId}/update_style`, {
      style
    });
    return response.data;
  }

  async refreshLayer(mapId: string, layerId: string) {
    let response = await this.axios.post(`/maps/${mapId}/layers/${layerId}/refresh`);
    return response.data;
  }

  async uploadLayerFromUrl(mapId: string, params: { importUrl: string; name?: string }) {
    let body: Record<string, unknown> = { import_url: params.importUrl };
    if (params.name !== undefined) body.name = params.name;

    let response = await this.axios.post(`/maps/${mapId}/upload`, body);
    return response.data;
  }

  async getLayerExportLink(mapId: string, layerId: string) {
    let response = await this.axios.get(`/maps/${mapId}/layers/${layerId}/get_export_link`);
    return response.data;
  }

  // ── Layer Groups ──────────────────────────────────────────────────────

  async listLayerGroups(mapId: string) {
    let response = await this.axios.get(`/maps/${mapId}/layer_groups`);
    return response.data;
  }

  async getLayerGroup(mapId: string, layerGroupId: string) {
    let response = await this.axios.get(`/maps/${mapId}/layer_groups/${layerGroupId}`);
    return response.data;
  }

  async createOrUpdateLayerGroups(
    mapId: string,
    groups: Array<{
      id?: string;
      name: string;
      caption?: string;
      orderingKey?: string;
      legendVisibility?: string;
    }>
  ) {
    let body = groups.map(g => {
      let item: Record<string, unknown> = { name: g.name };
      if (g.id !== undefined) item.id = g.id;
      if (g.caption !== undefined) item.caption = g.caption;
      if (g.orderingKey !== undefined) item.ordering_key = g.orderingKey;
      if (g.legendVisibility !== undefined) item.legend_visibility = g.legendVisibility;
      return item;
    });

    let response = await this.axios.post(`/maps/${mapId}/layer_groups`, body);
    return response.data;
  }

  async deleteLayerGroup(mapId: string, layerGroupId: string) {
    let response = await this.axios.delete(`/maps/${mapId}/layer_groups/${layerGroupId}`);
    return response.data;
  }

  // ── Elements ──────────────────────────────────────────────────────────

  async listElements(mapId: string) {
    let response = await this.axios.get(`/maps/${mapId}/elements`);
    return response.data;
  }

  async createOrUpdateElements(mapId: string, featureCollection: Record<string, unknown>) {
    let response = await this.axios.post(`/maps/${mapId}/elements`, featureCollection);
    return response.data;
  }

  async deleteElement(mapId: string, elementId: string) {
    let response = await this.axios.delete(`/maps/${mapId}/elements/${elementId}`);
    return response.data;
  }

  // ── Element Groups ────────────────────────────────────────────────────

  async listElementGroups(mapId: string) {
    let response = await this.axios.get(`/maps/${mapId}/element_groups`);
    return response.data;
  }

  async getElementGroup(mapId: string, groupId: string) {
    let response = await this.axios.get(`/maps/${mapId}/element_groups/${groupId}`);
    return response.data;
  }

  async createOrUpdateElementGroups(
    mapId: string,
    groups: Array<{
      id?: string;
      name: string;
      color?: string;
      symbol?: string;
    }>
  ) {
    let response = await this.axios.post(`/maps/${mapId}/element_groups`, groups);
    return response.data;
  }

  // ── Comments ──────────────────────────────────────────────────────────

  async exportComments(mapId: string, format: string = 'json') {
    let response = await this.axios.get(`/maps/${mapId}/comments/export`, {
      params: { format }
    });
    return response.data;
  }

  async resolveComment(mapId: string, commentId: string) {
    let response = await this.axios.post(`/maps/${mapId}/comments/${commentId}/resolve`);
    return response.data;
  }

  async deleteComment(mapId: string, commentId: string) {
    let response = await this.axios.delete(`/maps/${mapId}/comments/${commentId}`);
    return response.data;
  }

  // ── Users ─────────────────────────────────────────────────────────────

  async getCurrentUser() {
    let response = await this.axios.get('/user');
    return response.data;
  }

  // ── Embed Tokens ──────────────────────────────────────────────────────

  async createEmbedToken(mapId: string, userEmail: string) {
    let response = await this.axios.post(`/maps/${mapId}/embed_token`, null, {
      params: { user_email: userEmail }
    });
    return response.data;
  }

  // ── Sources ───────────────────────────────────────────────────────────

  async listSources(workspaceId?: string) {
    let params: Record<string, string> = {};
    if (workspaceId) params.workspace_id = workspaceId;

    let response = await this.axios.get('/sources', { params });
    return response.data;
  }

  async getSource(sourceId: string) {
    let response = await this.axios.get(`/sources/${sourceId}`);
    return response.data;
  }

  async createSource(params: {
    name: string;
    connection: Record<string, unknown>;
    permissions?: Record<string, unknown>;
  }) {
    let response = await this.axios.post('/sources', params);
    return response.data;
  }

  async updateSource(sourceId: string, params: Record<string, unknown>) {
    let response = await this.axios.post(`/sources/${sourceId}/update`, params);
    return response.data;
  }

  async syncSource(sourceId: string) {
    let response = await this.axios.post(`/sources/${sourceId}/sync`);
    return response.data;
  }

  async deleteSource(sourceId: string) {
    let response = await this.axios.delete(`/sources/${sourceId}`);
    return response.data;
  }

  // ── Projects ──────────────────────────────────────────────────────────

  async listProjects(workspaceId?: string) {
    let params: Record<string, string> = {};
    if (workspaceId) params.workspace_id = workspaceId;

    let response = await this.axios.get('/projects', { params });
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.axios.get(`/projects/${projectId}`);
    return response.data;
  }

  async createProject(params: {
    name: string;
    visibility: string;
    maxInheritedPermission?: string;
  }) {
    let body: Record<string, unknown> = {
      name: params.name,
      visibility: params.visibility
    };
    if (params.maxInheritedPermission !== undefined)
      body.max_inherited_permission = params.maxInheritedPermission;

    let response = await this.axios.post('/projects', body);
    return response.data;
  }

  async updateProject(
    projectId: string,
    params: {
      name?: string;
      visibility?: string;
      maxInheritedPermission?: string;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.visibility !== undefined) body.visibility = params.visibility;
    if (params.maxInheritedPermission !== undefined)
      body.max_inherited_permission = params.maxInheritedPermission;

    let response = await this.axios.post(`/projects/${projectId}/update`, body);
    return response.data;
  }

  async deleteProject(projectId: string) {
    let response = await this.axios.delete(`/projects/${projectId}`);
    return response.data;
  }

  // ── Library ───────────────────────────────────────────────────────────

  async listLibraryLayers() {
    let response = await this.axios.get('/library');
    return response.data;
  }
}
