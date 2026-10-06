import { createApiServiceError, createAuthenticatedAxios, pickDefined } from 'slates';
import { z } from 'zod';
import { getBaseUrl } from './regions';
import {
  activitySchema,
  assetSchema,
  collaboratorSchema,
  componentSchema,
  datasourceSchema,
  entrySchema,
  releaseSchema,
  roleSchema,
  spaceSchema,
  stageSchema,
  storySchema,
  tagSchema,
  userSchema,
  workflowSchema
} from './types';
import {
  clean,
  errorData,
  id,
  integer,
  own,
  pageInfo,
  paging,
  parse,
  text,
  token,
  upstreamError
} from './validation';

type Page = { page?: number; perPage?: number };
type StoryInput = {
  name?: string;
  slug?: string;
  content?: Record<string, unknown>;
  parentId?: number;
  isStartpage?: boolean;
  isFolder?: boolean;
  path?: string;
};
type ComponentInput = {
  name?: string;
  displayName?: string;
  schema?: Record<string, unknown>;
  isRoot?: boolean;
  isNestable?: boolean;
  componentGroupUuid?: string;
  color?: string;
  icon?: string;
};
type AssetInput = {
  name?: string;
  alt?: string;
  title?: string;
  copyright?: string;
  focus?: string;
  assetFolderId?: number;
  isPrivate?: boolean;
};
export type ManagementAuth = {
  token: string;
  region: string;
  mode?: 'pat' | 'oauth';
  spaceId?: string;
  refreshToken?: string;
};
export class StoryblokClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private spaceId?: string;
  private secrets: string[];
  private auth: ManagementAuth;
  constructor(params: ManagementAuth & { spaceId?: string }) {
    this.auth = params;
    this.spaceId = params.spaceId === undefined ? undefined : id(params.spaceId, 'spaceId');
    const credential = token(params.token);
    if (params.mode !== undefined && !['pat', 'oauth'].includes(params.mode))
      throw createApiServiceError('Reconnect using a supported Storyblok credential mode.', {
        reason: 'invalid_auth'
      });
    this.secrets = [credential, params.refreshToken ?? ''];
    this.axios = createAuthenticatedAxios({
      baseURL: getBaseUrl(params.region),
      authHeader: { value: params.mode === 'oauth' ? `Bearer ${credential}` : credential },
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 8 * 1024 * 1024,
      maxBodyLength: 8 * 1024 * 1024,
      errorAdapter: upstreamError
    });
  }
  private spacePath(path: string) {
    return `/spaces/${id(this.spaceId, 'spaceId')}${path}`;
  }
  private async request(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    data?: unknown,
    params?: Record<string, unknown>
  ) {
    const response = await this.axios.request<unknown>({ method, url: path, data, params });
    if (
      !Number.isInteger(response.status) ||
      response.status < 200 ||
      response.status >= 300 ||
      response.status === 202
    )
      throw createApiServiceError(
        'Storyblok has not confirmed this operation. Read the exact resource before retrying a write.',
        { reason: 'unconfirmed_operation', upstreamStatus: response.status }
      );
    clean(response.headers, this.secrets);
    return { ...response, data: clean(response.data, this.secrets) };
  }
  private async single<T>(
    schema: z.ZodType<T & { id: number }>,
    key: string,
    method: 'get' | 'post' | 'put',
    path: string,
    data?: unknown,
    expectedId?: string
  ) {
    const response = await this.request(method, this.spacePath(path), data);
    const result = parse(schema, own(response.data, key));
    if (expectedId !== undefined && String(result.id) !== id(expectedId, `${key}Id`))
      throw createApiServiceError(
        'Storyblok returned a different resource ID. Read the requested resource before retrying.',
        { reason: 'resource_mismatch' }
      );
    return result;
  }
  private async list<T>(
    schema: z.ZodType<T>,
    key: string,
    path: string,
    query: Record<string, unknown> = {}
  ) {
    const response = await this.request('get', this.spacePath(path), undefined, query);
    return {
      items: parse(z.array(schema), own(response.data, key)),
      headers: response.headers
    };
  }
  private async remove(
    key: string,
    resourceId: string,
    path: string,
    schema: z.ZodType<{ id: number; deleted_at?: string; permanently_deleted?: boolean }>
  ) {
    const target = id(resourceId, `${key}Id`);
    await this.single(schema, key, 'get', `${path}/${target}`, undefined, target);
    await this.request('delete', this.spacePath(`${path}/${target}`));
    try {
      const current = await this.single(
        schema,
        key,
        'get',
        `${path}/${target}`,
        undefined,
        target
      );
      if (key === 'asset' && (current.deleted_at || current.permanently_deleted === true))
        return;
    } catch (error) {
      if (own(errorData(error), 'upstreamStatus') === 404) return;
      throw createApiServiceError(
        'The deletion request was accepted but absence could not be verified. Read the exact resource before retrying.',
        { reason: 'deletion_unverified' }
      );
    }
    throw createApiServiceError(
      'Storyblok still returns the active resource after deletion; do not assume it was removed.',
      { reason: 'deletion_unverified' }
    );
  }
  private storyBody(story: StoryInput) {
    if (story.name !== undefined) text(story.name, 'name');
    if (story.slug !== undefined) text(story.slug, 'slug');
    if (story.parentId !== undefined) integer(story.parentId, 'parentId');
    if (story.content !== undefined) {
      if (typeof story.content.component !== 'string' || !story.content.component.trim())
        throw createApiServiceError(
          'Story content must include a component name. Discover an existing component with List Components.',
          { reason: 'invalid_content' }
        );
      clean(story.content, this.secrets);
    }
    return pickDefined({
      name: story.name,
      slug: story.slug,
      content: story.content,
      parent_id: story.parentId,
      is_startpage: story.isStartpage,
      is_folder: story.isFolder,
      path: story.path
    });
  }
  private componentBody(input: ComponentInput) {
    if (input.name !== undefined) text(input.name, 'name');
    return pickDefined({
      name: input.name,
      display_name: input.displayName,
      schema: input.schema,
      is_root: input.isRoot,
      is_nestable: input.isNestable,
      component_group_uuid: input.componentGroupUuid,
      color: input.color,
      icon: input.icon
    });
  }
  private change(body: Record<string, unknown>) {
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one supported field to update.', {
        reason: 'empty_update'
      });
    clean(body, this.secrets);
    return body;
  }
  async listStories(
    params: Page & {
      searchTerm?: string;
      sortBy?: string;
      withTag?: string;
      startsWith?: string;
      byUuids?: string;
      containComponent?: string;
      isPublished?: boolean;
      language?: string;
    } = {}
  ) {
    const query = paging(params);
    for (const [field, value] of Object.entries(params))
      if (typeof value === 'string') text(value, field);
    const data = await this.list(storySchema, 'stories', '/stories', {
      ...query,
      ...pickDefined({
        text_search: params.searchTerm,
        sort_by: params.sortBy,
        with_tag: params.withTag,
        starts_with: params.startsWith,
        by_uuids: params.byUuids,
        contain_component: params.containComponent,
        is_published: params.isPublished,
        language: params.language
      })
    });
    const info = pageInfo(data.headers, query, data.items.length, true);
    return { stories: data.items, ...info, total: info.total! };
  }
  getStory(storyId: string) {
    const target = id(storyId, 'storyId');
    return this.single(storySchema, 'story', 'get', `/stories/${target}`, undefined, target);
  }
  async createStory(story: StoryInput & { name: string }) {
    const created = await this.single(storySchema, 'story', 'post', '/stories', {
      story: this.storyBody(story),
      publish: false
    });
    if (created.name !== story.name)
      throw createApiServiceError(
        'Storyblok did not confirm the requested story name. Locate the created story before retrying.',
        { reason: 'unconfirmed_write' }
      );
    return created;
  }
  updateStory(storyId: string, story: StoryInput) {
    const target = id(storyId, 'storyId');
    return this.single(
      storySchema,
      'story',
      'put',
      `/stories/${target}`,
      { story: this.change(this.storyBody(story)) },
      target
    );
  }
  deleteStory(storyId: string) {
    return this.remove('story', storyId, '/stories', storySchema);
  }
  async publishStory(storyId: string, language?: string) {
    const target = id(storyId, 'storyId');
    if (language !== undefined) text(language, 'language');
    await this.request(
      'get',
      this.spacePath(`/stories/${target}/publish`),
      undefined,
      pickDefined({ lang: language })
    );
    const current = await this.getStory(target);
    if (language === undefined && current.published !== true)
      throw createApiServiceError(
        'The publish request was accepted but the story is not confirmed published. Read it before retrying.',
        { reason: 'publication_unverified' }
      );
    return current;
  }
  async unpublishStory(storyId: string) {
    const target = id(storyId, 'storyId');
    await this.request('get', this.spacePath(`/stories/${target}/unpublish`));
    const current = await this.getStory(target);
    if (current.published !== false)
      throw createApiServiceError(
        'The unpublish request was accepted but the story is not confirmed unpublished. Read it before retrying.',
        { reason: 'publication_unverified' }
      );
    return current;
  }
  async listComponents() {
    return (await this.list(componentSchema, 'components', '/components')).items;
  }
  getComponent(componentId: string) {
    const target = id(componentId, 'componentId');
    return this.single(
      componentSchema,
      'component',
      'get',
      `/components/${target}`,
      undefined,
      target
    );
  }
  createComponent(component: ComponentInput & { name: string }) {
    return this.single(componentSchema, 'component', 'post', '/components', {
      component: this.componentBody(component)
    });
  }
  updateComponent(componentId: string, component: ComponentInput) {
    const target = id(componentId, 'componentId');
    return this.single(
      componentSchema,
      'component',
      'put',
      `/components/${target}`,
      { component: this.change(this.componentBody(component)) },
      target
    );
  }
  deleteComponent(componentId: string) {
    return this.remove('component', componentId, '/components', componentSchema);
  }
  async listAssets(
    params: Page & { search?: string; inFolder?: number; isPrivate?: boolean } = {}
  ) {
    const query = paging(params);
    if (params.inFolder !== undefined) integer(params.inFolder, 'inFolder', -1);
    if (params.search !== undefined) text(params.search, 'search');
    const data = await this.list(assetSchema, 'assets', '/assets', {
      ...query,
      ...pickDefined({
        search: params.search,
        in_folder: params.inFolder,
        is_private: params.isPrivate === undefined ? undefined : Number(params.isPrivate)
      })
    });
    return { assets: data.items, ...pageInfo(data.headers, query, data.items.length) };
  }
  getAsset(assetId: string) {
    const target = id(assetId, 'assetId');
    return this.single(assetSchema, 'asset', 'get', `/assets/${target}`, undefined, target);
  }
  async updateAsset(assetId: string, asset: AssetInput) {
    const target = id(assetId, 'assetId');
    if (asset.assetFolderId !== undefined) integer(asset.assetFolderId, 'assetFolderId');
    const metadata = pickDefined({
      alt: asset.alt,
      title: asset.title,
      copyright: asset.copyright
    });
    const body = pickDefined({
      name: asset.name,
      focus: asset.focus,
      asset_folder_id: asset.assetFolderId,
      is_private: asset.isPrivate
    });
    if (Object.keys(metadata).length) {
      const current = await this.getAsset(target);
      body.meta_data = { ...current.meta_data, ...metadata };
    }
    await this.single(
      assetSchema,
      'asset',
      'put',
      `/assets/${target}`,
      { asset: this.change(body) },
      target
    );
    const current = await this.getAsset(target);
    for (const [field, expected] of Object.entries(metadata)) {
      const actual = own(current.meta_data, field) ?? own(current, field);
      if (actual !== expected)
        throw createApiServiceError(
          'Storyblok did not confirm the requested asset metadata. Read the exact asset before retrying.',
          { reason: 'unconfirmed_write' }
        );
    }
    for (const [field, expected] of Object.entries(body)) {
      if (field !== 'meta_data' && own(current, field) !== expected)
        throw createApiServiceError(
          'Storyblok did not confirm the requested asset change. Read the exact asset before retrying.',
          { reason: 'unconfirmed_write' }
        );
    }
    return current;
  }
  deleteAsset(assetId: string) {
    return this.remove('asset', assetId, '/assets', assetSchema);
  }
  async listDatasources(params: Page = {}) {
    const query = paging(params);
    const data = await this.list(datasourceSchema, 'datasources', '/datasources', query);
    return { datasources: data.items, ...pageInfo(data.headers, query, data.items.length) };
  }
  getDatasource(datasourceId: string) {
    const target = id(datasourceId, 'datasourceId');
    return this.single(
      datasourceSchema,
      'datasource',
      'get',
      `/datasources/${target}`,
      undefined,
      target
    );
  }
  createDatasource(datasource: { name: string; slug?: string }) {
    text(datasource.name, 'name');
    if (datasource.slug !== undefined) text(datasource.slug, 'slug');
    return this.single(datasourceSchema, 'datasource', 'post', '/datasources', {
      datasource: pickDefined(datasource)
    });
  }
  updateDatasource(datasourceId: string, datasource: { name?: string; slug?: string }) {
    const target = id(datasourceId, 'datasourceId');
    for (const [field, value] of Object.entries(datasource))
      if (value !== undefined) text(value, field);
    return this.single(
      datasourceSchema,
      'datasource',
      'put',
      `/datasources/${target}`,
      { datasource: this.change(pickDefined(datasource)) },
      target
    );
  }
  deleteDatasource(datasourceId: string) {
    return this.remove('datasource', datasourceId, '/datasources', datasourceSchema);
  }
  async listDatasourceEntries(
    datasourceId: string,
    params: Page & { dimensionId?: string } = {}
  ) {
    const query = paging(params);
    const data = await this.list(entrySchema, 'datasource_entries', '/datasource_entries', {
      ...query,
      datasource_id: id(datasourceId, 'datasourceId'),
      ...pickDefined({
        dimension_id:
          params.dimensionId === undefined ? undefined : id(params.dimensionId, 'dimensionId')
      })
    });
    return { entries: data.items, ...pageInfo(data.headers, query, data.items.length) };
  }
  getDatasourceEntry(entryId: string) {
    const target = id(entryId, 'entryId');
    return this.single(
      entrySchema,
      'datasource_entry',
      'get',
      `/datasource_entries/${target}`,
      undefined,
      target
    );
  }
  async createDatasourceEntry(entry: {
    name: string;
    value: string;
    datasourceId: string;
    dimensionValue?: string;
  }) {
    text(entry.name, 'name');
    text(entry.value, 'value', true);
    const parent = id(entry.datasourceId, 'datasourceId');
    const result = await this.single(
      entrySchema,
      'datasource_entry',
      'post',
      '/datasource_entries',
      {
        datasource_entry: pickDefined({
          name: entry.name,
          value: entry.value,
          datasource_id: Number(parent),
          dimension_value: entry.dimensionValue
        })
      }
    );
    if (result.datasource_id !== Number(parent))
      throw createApiServiceError(
        'Storyblok did not confirm the datasource association. Read the entry before retrying.',
        { reason: 'resource_mismatch' }
      );
    return result;
  }
  updateDatasourceEntry(
    entryId: string,
    entry: { name?: string; value?: string; dimensionValue?: string }
  ) {
    const target = id(entryId, 'entryId');
    if (entry.name !== undefined) text(entry.name, 'name');
    return this.single(
      entrySchema,
      'datasource_entry',
      'put',
      `/datasource_entries/${target}`,
      {
        datasource_entry: this.change(
          pickDefined({
            name: entry.name,
            value: entry.value,
            dimension_value: entry.dimensionValue
          })
        )
      },
      target
    );
  }
  deleteDatasourceEntry(entryId: string) {
    return this.remove('datasource_entry', entryId, '/datasource_entries', entrySchema);
  }
  async listCollaborators(params: Page = {}) {
    const query = paging(params, 100);
    const data = await this.list(collaboratorSchema, 'collaborators', '/collaborators', query);
    return { collaborators: data.items, ...pageInfo(data.headers, query, data.items.length) };
  }
  async addCollaborator(input: { email: string; role?: string; spaceRoleId?: number }) {
    text(input.email, 'email');
    if (input.spaceRoleId !== undefined) integer(input.spaceRoleId, 'spaceRoleId', 1);
    let role = input.role;
    let spaceRoleId = input.spaceRoleId;
    if (
      spaceRoleId !== undefined ||
      (role !== undefined && !['admin', 'editor'].includes(role))
    ) {
      const roles = await this.listSpaceRoles();
      const matches = roles.filter(r =>
        spaceRoleId !== undefined
          ? r.id === spaceRoleId
          : r.role === role || String(r.id) === role
      );
      const selected = matches.length === 1 ? matches[0] : undefined;
      if (
        !selected ||
        (role !== undefined && role !== selected.role && role !== String(selected.id))
      )
        throw createApiServiceError(
          'Select one matching custom role ID or exact name from Get Space Info; do not combine it with a different role.',
          { reason: 'invalid_collaborator_role' }
        );
      spaceRoleId = selected.id;
      role = String(selected.id);
    }
    text(role, 'role (admin, editor, or an exact custom role from Get Space Info)');
    const result = await this.single(
      collaboratorSchema,
      'collaborator',
      'post',
      '/collaborators',
      pickDefined({ email: input.email, role, space_role_id: spaceRoleId })
    );
    const email = result.user?.real_email ?? result.user?.email ?? result.email;
    if (email === undefined || email.toLowerCase() !== input.email.toLowerCase())
      throw createApiServiceError(
        'Storyblok did not confirm the collaborator email. List collaborators before repeating an invitation.',
        { reason: 'invitation_unverified' }
      );
    return result;
  }
  async removeCollaborator(collaboratorId: string) {
    const target = id(collaboratorId, 'collaboratorId');
    const all = await this.allCollaborators();
    if (!all.some(c => String(c.id) === target))
      throw createApiServiceError(
        'The collaborator is not present in a complete current inventory; no removal was sent.',
        { reason: 'resource_not_found' }
      );
    await this.request('delete', this.spacePath(`/collaborators/${target}`));
    if ((await this.allCollaborators()).some(c => String(c.id) === target))
      throw createApiServiceError('The collaborator removal was not confirmed.', {
        reason: 'deletion_unverified'
      });
  }
  private async allCollaborators() {
    const items: z.infer<typeof collaboratorSchema>[] = [];
    let total: number | undefined;
    const ids = new Set<number>();
    for (let page = 1; page <= 100; page++) {
      const result = await this.listCollaborators({ page, perPage: 100 });
      if (result.total === undefined || (total !== undefined && result.total !== total))
        throw createApiServiceError(
          'A complete, stable collaborator total is required before removal; no further action was sent.',
          { reason: 'inventory_incomplete' }
        );
      total = result.total;
      for (const row of result.collaborators) {
        if (ids.has(row.id))
          throw createApiServiceError('Collaborator inventory repeated a resource ID.', {
            reason: 'inventory_incomplete'
          });
        ids.add(row.id);
      }
      items.push(...result.collaborators);
      if (result.nextPage === undefined) {
        if (items.length !== total)
          throw createApiServiceError('The collaborator inventory was incomplete.', {
            reason: 'inventory_incomplete'
          });
        return items;
      }
    }
    throw createApiServiceError(
      'Collaborator inventory exceeds the safe verification bound; no further action is sent.',
      { reason: 'inventory_incomplete' }
    );
  }
  async listSpaceRoles() {
    return (await this.list(roleSchema, 'space_roles', '/space_roles')).items;
  }
  async listWorkflows() {
    return (await this.list(workflowSchema, 'workflows', '/workflows')).items;
  }
  async listWorkflowStages() {
    return (await this.list(stageSchema, 'workflow_stages', '/workflow_stages')).items;
  }
  async listReleases() {
    const data = await this.list(releaseSchema, 'releases', '/releases');
    return { releases: data.items };
  }
  getRelease(releaseId: string) {
    const target = id(releaseId, 'releaseId');
    return this.single(
      releaseSchema,
      'release',
      'get',
      `/releases/${target}`,
      undefined,
      target
    );
  }
  createRelease(release: { name: string; releaseAt?: string; timezone?: string }) {
    text(release.name, 'name');
    if (release.releaseAt !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(release.releaseAt))
        throw createApiServiceError(
          'Provide releaseAt in Storyblok wall-clock format YYYY-MM-DD HH:mm with an explicit timezone; ISO offsets are not inferred.',
          { reason: 'invalid_release_date' }
        );
      const iso = `${release.releaseAt.replace(' ', 'T')}:00Z`;
      const date = new Date(iso);
      if (
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 16) !== iso.slice(0, 16)
      )
        throw createApiServiceError('Provide a real calendar date and time for releaseAt.', {
          reason: 'invalid_release_date'
        });
      if (!release.timezone)
        throw createApiServiceError('Provide the timezone for the scheduled release.', {
          reason: 'missing_timezone'
        });
      try {
        new Intl.DateTimeFormat('en', { timeZone: release.timezone });
      } catch {
        throw createApiServiceError(
          'Provide a valid IANA timezone for the scheduled release.',
          { reason: 'invalid_timezone' }
        );
      }
    }
    return this.single(releaseSchema, 'release', 'post', '/releases', {
      release: pickDefined({
        name: release.name,
        release_at: release.releaseAt,
        timezone: release.timezone
      })
    });
  }
  deleteRelease(releaseId: string) {
    return this.remove('release', releaseId, '/releases', releaseSchema);
  }
  async mergeRelease(releaseId: string) {
    const target = id(releaseId, 'releaseId');
    await this.single(
      releaseSchema,
      'release',
      'put',
      `/releases/${target}`,
      { do_release: true, release: {} },
      target
    );
    const result = await this.getRelease(target);
    if (result.released !== true)
      throw createApiServiceError(
        'Storyblok did not confirm release deployment. Read the release before retrying.',
        { reason: 'release_unverified' }
      );
    return result;
  }
  async listTags(params: Page = {}) {
    const query = paging(params);
    const data = await this.list(tagSchema, 'tags', '/tags', query);
    return { tags: data.items, ...pageInfo(data.headers, query, data.items.length) };
  }
  getSpace() {
    return this.single(
      spaceSchema,
      'space',
      'get',
      '',
      undefined,
      id(this.spaceId, 'spaceId')
    );
  }
  async listActivities(params: Page = {}) {
    const query = paging(params);
    const data = await this.list(activitySchema, 'activities', '/activities', query);
    return { activities: data.items, ...pageInfo(data.headers, query, data.items.length) };
  }
  async getCurrentUser() {
    const response = await this.request(
      'get',
      this.auth.mode === 'oauth' ? '/user_info' : '/users/me'
    );
    return parse(userSchema, own(response.data, 'user'));
  }
  async listSpaces() {
    if (this.auth.mode === 'oauth') {
      const response = await this.request('get', '/space_info');
      const space = parse(spaceSchema, own(response.data, 'space'));
      if (
        this.auth.spaceId !== undefined &&
        String(space.id) !== id(this.auth.spaceId, 'authorized spaceId')
      )
        throw createApiServiceError('Storyblok returned a different authorized space.', {
          reason: 'space_binding'
        });
      return {
        spaces: [space],
        region: this.auth.region,
        discovery: 'authorized_space' as const
      };
    }
    const response = await this.request('get', '/spaces');
    const spaces = parse(z.array(spaceSchema), own(response.data, 'spaces'));
    return { spaces, region: this.auth.region, discovery: 'regional_spaces' as const };
  }
}
