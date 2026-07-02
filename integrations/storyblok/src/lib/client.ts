import { createAxios } from 'slates';
import { getBaseUrl } from './regions';
import type {
  StoryblokActivity,
  StoryblokAsset,
  StoryblokCollaborator,
  StoryblokComponent,
  StoryblokDatasource,
  StoryblokDatasourceEntry,
  StoryblokRelease,
  StoryblokSpace,
  StoryblokSpaceRole,
  StoryblokStory,
  StoryblokTag,
  StoryblokWebhook,
  StoryblokWorkflow,
  StoryblokWorkflowStage
} from './types';

export class StoryblokClient {
  private axios: ReturnType<typeof createAxios>;
  private spaceId: string;

  constructor(params: { token: string; region: string; spaceId: string }) {
    this.spaceId = params.spaceId;

    let baseURL = getBaseUrl(params.region);

    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: params.token,
        'Content-Type': 'application/json'
      }
    });
  }

  private spacePath(path: string): string {
    return `/spaces/${this.spaceId}${path}`;
  }

  // ─── Stories ──────────────────────────────────────────────────

  async listStories(params?: {
    page?: number;
    perPage?: number;
    searchTerm?: string;
    sortBy?: string;
    withTag?: string;
    startsWith?: string;
    bySlug?: string;
    containComponent?: string;
    inWorkflowStages?: string;
    byUuids?: string;
    isPublished?: boolean;
    language?: string;
  }): Promise<{ stories: StoryblokStory[]; total: number }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.searchTerm) query.search_term = params.searchTerm;
    if (params?.sortBy) query.sort_by = params.sortBy;
    if (params?.withTag) query.with_tag = params.withTag;
    if (params?.startsWith) query.starts_with = params.startsWith;
    if (params?.bySlug) query.by_slugs = params.bySlug;
    if (params?.containComponent) query.contain_component = params.containComponent;
    if (params?.inWorkflowStages) query.in_workflow_stages = params.inWorkflowStages;
    if (params?.byUuids) query.by_uuids = params.byUuids;
    if (params?.isPublished !== undefined) query.is_published = params.isPublished;
    if (params?.language) query.language = params.language;

    let response = await this.axios.get(this.spacePath('/stories'), { params: query });
    let total = Number.parseInt(response.headers?.total || '0', 10);
    let data = response.data as { stories: StoryblokStory[] };
    return { stories: data.stories, total };
  }

  async getStory(storyId: string): Promise<StoryblokStory> {
    let response = await this.axios.get(this.spacePath(`/stories/${storyId}`));
    let data = response.data as { story: StoryblokStory };
    return data.story;
  }

  async createStory(story: {
    name: string;
    slug?: string;
    content?: Record<string, any>;
    parentId?: number;
    isStartpage?: boolean;
    isFolder?: boolean;
    defaultRoot?: string;
    disableFeEditor?: boolean;
    path?: string;
  }): Promise<StoryblokStory> {
    let body: Record<string, any> = {
      name: story.name
    };
    if (story.slug) body.slug = story.slug;
    if (story.content) body.content = story.content;
    if (story.parentId) body.parent_id = story.parentId;
    if (story.isStartpage !== undefined) body.is_startpage = story.isStartpage;
    if (story.isFolder !== undefined) body.is_folder = story.isFolder;
    if (story.defaultRoot) body.default_root = story.defaultRoot;
    if (story.disableFeEditor !== undefined) body.disable_fe_editor = story.disableFeEditor;
    if (story.path) body.path = story.path;

    let response = await this.axios.post(this.spacePath('/stories'), { story: body });
    let data = response.data as { story: StoryblokStory };
    return data.story;
  }

  async updateStory(
    storyId: string,
    story: {
      name?: string;
      slug?: string;
      content?: Record<string, any>;
      parentId?: number;
      isStartpage?: boolean;
      path?: string;
      scheduleAt?: string;
      metaData?: Record<string, any>;
    }
  ): Promise<StoryblokStory> {
    let body: Record<string, any> = {};
    if (story.name) body.name = story.name;
    if (story.slug) body.slug = story.slug;
    if (story.content) body.content = story.content;
    if (story.parentId !== undefined) body.parent_id = story.parentId;
    if (story.isStartpage !== undefined) body.is_startpage = story.isStartpage;
    if (story.path !== undefined) body.path = story.path;
    if (story.scheduleAt) body.schedule_at = story.scheduleAt;
    if (story.metaData) body.meta_data = story.metaData;

    let response = await this.axios.put(this.spacePath(`/stories/${storyId}`), {
      story: body
    });
    let data = response.data as { story: StoryblokStory };
    return data.story;
  }

  async deleteStory(storyId: string): Promise<void> {
    await this.axios.delete(this.spacePath(`/stories/${storyId}`));
  }

  async publishStory(storyId: string, language?: string): Promise<StoryblokStory> {
    let params: Record<string, any> = {};
    if (language) params.lang = language;
    let response = await this.axios.get(this.spacePath(`/stories/${storyId}/publish`), {
      params
    });
    let data = response.data as { story: StoryblokStory };
    return data.story;
  }

  async unpublishStory(storyId: string): Promise<StoryblokStory> {
    let response = await this.axios.get(this.spacePath(`/stories/${storyId}/unpublish`));
    let data = response.data as { story: StoryblokStory };
    return data.story;
  }

  // ─── Components ───────────────────────────────────────────────

  async listComponents(): Promise<StoryblokComponent[]> {
    let response = await this.axios.get(this.spacePath('/components'));
    let data = response.data as { components: StoryblokComponent[] };
    return data.components;
  }

  async getComponent(componentId: string): Promise<StoryblokComponent> {
    let response = await this.axios.get(this.spacePath(`/components/${componentId}`));
    let data = response.data as { component: StoryblokComponent };
    return data.component;
  }

  async createComponent(component: {
    name: string;
    displayName?: string;
    schema?: Record<string, any>;
    isRoot?: boolean;
    isNestable?: boolean;
    componentGroupUuid?: string;
    color?: string;
    icon?: string;
    image?: string;
  }): Promise<StoryblokComponent> {
    let body: Record<string, any> = { name: component.name };
    if (component.displayName) body.display_name = component.displayName;
    if (component.schema) body.schema = component.schema;
    if (component.isRoot !== undefined) body.is_root = component.isRoot;
    if (component.isNestable !== undefined) body.is_nestable = component.isNestable;
    if (component.componentGroupUuid) body.component_group_uuid = component.componentGroupUuid;
    if (component.color) body.color = component.color;
    if (component.icon) body.icon = component.icon;
    if (component.image) body.image = component.image;

    let response = await this.axios.post(this.spacePath('/components'), { component: body });
    let data = response.data as { component: StoryblokComponent };
    return data.component;
  }

  async updateComponent(
    componentId: string,
    component: {
      name?: string;
      displayName?: string;
      schema?: Record<string, any>;
      isRoot?: boolean;
      isNestable?: boolean;
      componentGroupUuid?: string;
      color?: string;
      icon?: string;
      image?: string;
    }
  ): Promise<StoryblokComponent> {
    let body: Record<string, any> = {};
    if (component.name) body.name = component.name;
    if (component.displayName) body.display_name = component.displayName;
    if (component.schema) body.schema = component.schema;
    if (component.isRoot !== undefined) body.is_root = component.isRoot;
    if (component.isNestable !== undefined) body.is_nestable = component.isNestable;
    if (component.componentGroupUuid) body.component_group_uuid = component.componentGroupUuid;
    if (component.color) body.color = component.color;
    if (component.icon) body.icon = component.icon;
    if (component.image) body.image = component.image;

    let response = await this.axios.put(this.spacePath(`/components/${componentId}`), {
      component: body
    });
    let data = response.data as { component: StoryblokComponent };
    return data.component;
  }

  async deleteComponent(componentId: string): Promise<void> {
    await this.axios.delete(this.spacePath(`/components/${componentId}`));
  }

  // ─── Assets ───────────────────────────────────────────────────

  async listAssets(params?: {
    page?: number;
    perPage?: number;
    search?: string;
    inFolder?: number;
    sortBy?: string;
    isPrivate?: boolean;
  }): Promise<{ assets: StoryblokAsset[] }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.search) query.search = params.search;
    if (params?.inFolder) query.in_folder = params.inFolder;
    if (params?.sortBy) query.sort_by = params.sortBy;
    if (params?.isPrivate !== undefined) query.is_private = params.isPrivate;

    let response = await this.axios.get(this.spacePath('/assets'), { params: query });
    let data = response.data as { assets: StoryblokAsset[] };
    return { assets: data.assets };
  }

  async getAsset(assetId: string): Promise<StoryblokAsset> {
    let response = await this.axios.get(this.spacePath(`/assets/${assetId}`));
    let data = response.data as StoryblokAsset;
    return data;
  }

  async updateAsset(
    assetId: string,
    asset: {
      name?: string;
      alt?: string;
      title?: string;
      copyright?: string;
      focus?: string;
      assetFolderId?: number;
      isPrivate?: boolean;
      source?: string;
    }
  ): Promise<StoryblokAsset> {
    let body: Record<string, any> = {};
    if (asset.name) body.name = asset.name;
    if (asset.alt !== undefined) body.alt = asset.alt;
    if (asset.title !== undefined) body.title = asset.title;
    if (asset.copyright !== undefined) body.copyright = asset.copyright;
    if (asset.focus !== undefined) body.focus = asset.focus;
    if (asset.assetFolderId !== undefined) body.asset_folder_id = asset.assetFolderId;
    if (asset.isPrivate !== undefined) body.is_private = asset.isPrivate;
    if (asset.source !== undefined) body.source = asset.source;

    let response = await this.axios.put(this.spacePath(`/assets/${assetId}`), { asset: body });
    let data = response.data as StoryblokAsset;
    return data;
  }

  async deleteAsset(assetId: string): Promise<void> {
    await this.axios.delete(this.spacePath(`/assets/${assetId}`));
  }

  // ─── Datasources ──────────────────────────────────────────────

  async listDatasources(): Promise<StoryblokDatasource[]> {
    let response = await this.axios.get(this.spacePath('/datasources'));
    let data = response.data as { datasources: StoryblokDatasource[] };
    return data.datasources;
  }

  async getDatasource(datasourceId: string): Promise<StoryblokDatasource> {
    let response = await this.axios.get(this.spacePath(`/datasources/${datasourceId}`));
    let data = response.data as { datasource: StoryblokDatasource };
    return data.datasource;
  }

  async createDatasource(datasource: {
    name: string;
    slug?: string;
  }): Promise<StoryblokDatasource> {
    let body: Record<string, any> = { name: datasource.name };
    if (datasource.slug) body.slug = datasource.slug;

    let response = await this.axios.post(this.spacePath('/datasources'), { datasource: body });
    let data = response.data as { datasource: StoryblokDatasource };
    return data.datasource;
  }

  async updateDatasource(
    datasourceId: string,
    datasource: {
      name?: string;
      slug?: string;
    }
  ): Promise<StoryblokDatasource> {
    let body: Record<string, any> = {};
    if (datasource.name) body.name = datasource.name;
    if (datasource.slug) body.slug = datasource.slug;

    let response = await this.axios.put(this.spacePath(`/datasources/${datasourceId}`), {
      datasource: body
    });
    let data = response.data as { datasource: StoryblokDatasource };
    return data.datasource;
  }

  async deleteDatasource(datasourceId: string): Promise<void> {
    await this.axios.delete(this.spacePath(`/datasources/${datasourceId}`));
  }

  // ─── Datasource Entries ───────────────────────────────────────

  async listDatasourceEntries(
    datasourceId: string,
    params?: {
      page?: number;
      perPage?: number;
      dimensionId?: string;
    }
  ): Promise<StoryblokDatasourceEntry[]> {
    let query: Record<string, any> = { datasource_id: datasourceId };
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.dimensionId) query.dimension_id = params.dimensionId;

    let response = await this.axios.get(this.spacePath('/datasource_entries'), {
      params: query
    });
    let data = response.data as { datasource_entries: StoryblokDatasourceEntry[] };
    return data.datasource_entries;
  }

  async createDatasourceEntry(entry: {
    name: string;
    value: string;
    datasourceId: string;
    dimensionValue?: string;
  }): Promise<StoryblokDatasourceEntry> {
    let body: Record<string, any> = {
      name: entry.name,
      value: entry.value,
      datasource_id: entry.datasourceId
    };
    if (entry.dimensionValue) body.dimension_value = entry.dimensionValue;

    let response = await this.axios.post(this.spacePath('/datasource_entries'), {
      datasource_entry: body
    });
    let data = response.data as { datasource_entry: StoryblokDatasourceEntry };
    return data.datasource_entry;
  }

  async updateDatasourceEntry(
    entryId: string,
    entry: {
      name?: string;
      value?: string;
      dimensionValue?: string;
    }
  ): Promise<StoryblokDatasourceEntry> {
    let body: Record<string, any> = {};
    if (entry.name) body.name = entry.name;
    if (entry.value !== undefined) body.value = entry.value;
    if (entry.dimensionValue !== undefined) body.dimension_value = entry.dimensionValue;

    let response = await this.axios.put(this.spacePath(`/datasource_entries/${entryId}`), {
      datasource_entry: body
    });
    let data = response.data as { datasource_entry: StoryblokDatasourceEntry };
    return data.datasource_entry;
  }

  async deleteDatasourceEntry(entryId: string): Promise<void> {
    await this.axios.delete(this.spacePath(`/datasource_entries/${entryId}`));
  }

  // ─── Collaborators ────────────────────────────────────────────

  async listCollaborators(): Promise<StoryblokCollaborator[]> {
    let response = await this.axios.get(this.spacePath('/collaborators'));
    let data = response.data as { collaborators: StoryblokCollaborator[] };
    return data.collaborators;
  }

  async addCollaborator(params: {
    email: string;
    roleId?: number;
    spaceRoleId?: number;
    permissions?: string[];
  }): Promise<StoryblokCollaborator> {
    let body: Record<string, any> = { email: params.email };
    if (params.roleId) body.role_id = params.roleId;
    if (params.spaceRoleId) body.space_role_id = params.spaceRoleId;
    if (params.permissions) body.permissions = params.permissions;

    let response = await this.axios.post(this.spacePath('/collaborators'), {
      collaborator: body
    });
    let data = response.data as { collaborator: StoryblokCollaborator };
    return data.collaborator;
  }

  async removeCollaborator(collaboratorId: string): Promise<void> {
    await this.axios.delete(this.spacePath(`/collaborators/${collaboratorId}`));
  }

  // ─── Space Roles ──────────────────────────────────────────────

  async listSpaceRoles(): Promise<StoryblokSpaceRole[]> {
    let response = await this.axios.get(this.spacePath('/space_roles'));
    let data = response.data as { space_roles: StoryblokSpaceRole[] };
    return data.space_roles;
  }

  // ─── Workflows & Stages ───────────────────────────────────────

  async listWorkflows(): Promise<StoryblokWorkflow[]> {
    let response = await this.axios.get(this.spacePath('/workflows'));
    let data = response.data as { workflows: StoryblokWorkflow[] };
    return data.workflows;
  }

  async listWorkflowStages(params?: {
    workflowId?: string;
  }): Promise<StoryblokWorkflowStage[]> {
    let query: Record<string, any> = {};
    if (params?.workflowId) query.workflow_id = params.workflowId;

    let response = await this.axios.get(this.spacePath('/workflow_stages'), { params: query });
    let data = response.data as { workflow_stages: StoryblokWorkflowStage[] };
    return data.workflow_stages;
  }

  // ─── Releases ─────────────────────────────────────────────────

  async listReleases(params?: {
    page?: number;
    perPage?: number;
  }): Promise<StoryblokRelease[]> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get(this.spacePath('/releases'), { params: query });
    let data = response.data as { releases: StoryblokRelease[] };
    return data.releases;
  }

  async getRelease(releaseId: string): Promise<StoryblokRelease> {
    let response = await this.axios.get(this.spacePath(`/releases/${releaseId}`));
    let data = response.data as { release: StoryblokRelease };
    return data.release;
  }

  async createRelease(release: {
    name: string;
    releaseAt?: string;
    branchesToDeploy?: number[];
    timezone?: string;
  }): Promise<StoryblokRelease> {
    let body: Record<string, any> = { name: release.name };
    if (release.releaseAt) body.release_at = release.releaseAt;
    if (release.branchesToDeploy) body.branches_to_deploy = release.branchesToDeploy;
    if (release.timezone) body.timezone = release.timezone;

    let response = await this.axios.post(this.spacePath('/releases'), { release: body });
    let data = response.data as { release: StoryblokRelease };
    return data.release;
  }

  async deleteRelease(releaseId: string): Promise<void> {
    await this.axios.delete(this.spacePath(`/releases/${releaseId}`));
  }

  async mergeRelease(releaseId: string): Promise<void> {
    await this.axios.post(this.spacePath(`/releases/${releaseId}/merge`));
  }

  // ─── Tags ─────────────────────────────────────────────────────

  async listTags(): Promise<StoryblokTag[]> {
    let response = await this.axios.get(this.spacePath('/tags'));
    let data = response.data as { tags: StoryblokTag[] };
    return data.tags;
  }

  // ─── Space ────────────────────────────────────────────────────

  async getSpace(): Promise<StoryblokSpace> {
    let response = await this.axios.get(this.spacePath(''));
    let data = response.data as { space: StoryblokSpace };
    return data.space;
  }

  // ─── Activities ───────────────────────────────────────────────

  async listActivities(params?: {
    page?: number;
    perPage?: number;
  }): Promise<StoryblokActivity[]> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get(this.spacePath('/activities'), { params: query });
    let data = response.data as { activities: StoryblokActivity[] };
    return data.activities;
  }

  // ─── Webhooks ─────────────────────────────────────────────────

  async listWebhooks(): Promise<StoryblokWebhook[]> {
    let response = await this.axios.get(this.spacePath('/webhook_endpoints'));
    let data = response.data as { webhook_endpoints: StoryblokWebhook[] };
    return data.webhook_endpoints;
  }

  async createWebhook(webhook: {
    name: string;
    endpoint: string;
    actions?: string[];
    activated?: boolean;
    secret?: string;
  }): Promise<StoryblokWebhook> {
    let body: Record<string, any> = {
      name: webhook.name,
      endpoint: webhook.endpoint
    };
    if (webhook.actions) body.actions = webhook.actions;
    if (webhook.activated !== undefined) body.activated = webhook.activated;
    if (webhook.secret) body.secret = webhook.secret;

    let response = await this.axios.post(this.spacePath('/webhook_endpoints'), {
      webhook_endpoint: body
    });
    let data = response.data as { webhook_endpoint: StoryblokWebhook };
    return data.webhook_endpoint;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(this.spacePath(`/webhook_endpoints/${webhookId}`));
  }
}
