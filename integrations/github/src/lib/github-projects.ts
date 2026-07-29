import { createApiServiceError } from 'slates';
import { cursorPageInfoFromLink, GitHubClient, type GitHubClientConfig } from './client';

export type ProjectOwnerType = 'org' | 'user';
export type GitHubRecord = Record<string, any>;

export interface ProjectsPagination {
  perPage?: number;
  after?: string;
  before?: string;
}

export interface ProjectIteration {
  title: string;
  start_date: string;
  duration: number;
}

export interface ProjectItemFieldUpdate {
  id?: number;
  name?: string;
  value?: unknown;
}

interface ProjectItemsQueryResult {
  repository?: {
    issue?: {
      projectItems?: {
        nodes?: Array<{
          id?: string;
          fullDatabaseId?: string;
          project?: { id?: string };
        }>;
        pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
      };
    } | null;
  } | null;
}

const projectsApiHeaders = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2026-03-10'
};

let encode = (value: string | number) => encodeURIComponent(String(value));

let validationError = (message: string, reason = 'github_projects_validation_error') =>
  createApiServiceError(message, { reason });

let boundedPageSize = (perPage?: number) => Math.min(Math.max(perPage ?? 50, 1), 50);

let optionName = (option: GitHubRecord): string | undefined => {
  if (typeof option.name === 'string') {
    return option.name;
  }
  if (option.name && typeof option.name.raw === 'string') {
    return option.name.raw;
  }
  return undefined;
};

let ensureDate = (value: string, field: string) => {
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw validationError(`${field} must use YYYY-MM-DD format.`);
  }
  let timestamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  let date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    throw validationError(`${field} must be a valid date in YYYY-MM-DD format.`);
  }
};

export class GitHubProjectsApi {
  private client: GitHubClient;

  constructor(auth: GitHubClientConfig) {
    this.client = new GitHubClient(auth);
  }

  private ownerBase(owner: string, ownerType: ProjectOwnerType) {
    return ownerType === 'org'
      ? `/orgs/${encode(owner)}/projectsV2`
      : `/users/${encode(owner)}/projectsV2`;
  }

  private async rest<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    operation: string,
    reason: string,
    options: {
      query?: Record<string, unknown>;
      body?: unknown;
    } = {}
  ) {
    return await this.client.requestRest<T>({
      method,
      path,
      operation,
      reason,
      query: options.query,
      body: options.body,
      headers: projectsApiHeaders
    });
  }

  private async restPage<T>(
    path: string,
    operation: string,
    reason: string,
    query: Record<string, unknown>
  ) {
    let response = await this.client.requestRestWithMetadata<T>({
      method: 'GET',
      path,
      operation,
      reason,
      query,
      headers: projectsApiHeaders
    });
    return {
      data: response.data,
      pageInfo: cursorPageInfoFromLink(response.linkHeader)
    };
  }

  private async withOwner<T>(
    ownerType: ProjectOwnerType | undefined,
    request: (resolvedType: ProjectOwnerType) => Promise<T>
  ): Promise<{ ownerType: ProjectOwnerType; value: T }> {
    if (ownerType) {
      return { ownerType, value: await request(ownerType) };
    }

    try {
      return { ownerType: 'user', value: await request('user') };
    } catch {
      try {
        return { ownerType: 'org', value: await request('org') };
      } catch {
        throw validationError(
          'Could not determine whether the project owner is a user or organization with access to this project.',
          'github_project_owner_not_found'
        );
      }
    }
  }

  async listProjects(
    owner: string,
    ownerType: ProjectOwnerType | undefined,
    options: ProjectsPagination & { query?: string }
  ): Promise<GitHubRecord> {
    let query = {
      q: options.query,
      per_page: boundedPageSize(options.perPage),
      after: options.after,
      before: options.before
    };
    let request = (type: ProjectOwnerType) =>
      this.restPage<GitHubRecord[]>(
        this.ownerBase(owner, type),
        'list projects',
        'github_list_projects_failed',
        query
      );

    if (ownerType) {
      let response = await request(ownerType);
      return {
        projects: response.data.map(project => ({ ...project, owner_type: ownerType })),
        pageInfo: response.pageInfo
      };
    }

    let userResponse:
      | { data: GitHubRecord[]; pageInfo: ReturnType<typeof cursorPageInfoFromLink> }
      | undefined;
    let organizationResponse:
      | { data: GitHubRecord[]; pageInfo: ReturnType<typeof cursorPageInfoFromLink> }
      | undefined;
    try {
      userResponse = await request('user');
    } catch {
      userResponse = undefined;
    }
    try {
      organizationResponse = await request('org');
    } catch {
      organizationResponse = undefined;
    }
    if (!userResponse && !organizationResponse) {
      throw validationError(
        `No user or organization projects were found for owner "${owner}".`,
        'github_projects_owner_not_found'
      );
    }

    return {
      projects: [
        ...(userResponse?.data ?? []).map(project => ({ ...project, owner_type: 'user' })),
        ...(organizationResponse?.data ?? []).map(project => ({
          ...project,
          owner_type: 'org'
        }))
      ],
      pageInfo: organizationResponse?.pageInfo ?? userResponse?.pageInfo,
      note: 'Results include both user and organization projects. Specify owner_type for unambiguous cursor pagination.'
    };
  }

  async getProject(
    owner: string,
    ownerType: ProjectOwnerType | undefined,
    projectNumber: number
  ) {
    return await this.withOwner(ownerType, type =>
      this.rest<GitHubRecord>(
        'GET',
        `${this.ownerBase(owner, type)}/${encode(projectNumber)}`,
        'get project',
        'github_get_project_failed'
      )
    );
  }

  async listProjectFields(
    owner: string,
    ownerType: ProjectOwnerType | undefined,
    projectNumber: number,
    pagination: ProjectsPagination = {}
  ) {
    return await this.withOwner(ownerType, type =>
      this.restPage<GitHubRecord[]>(
        `${this.ownerBase(owner, type)}/${encode(projectNumber)}/fields`,
        'list project fields',
        'github_list_project_fields_failed',
        {
          per_page: boundedPageSize(pagination.perPage),
          after: pagination.after,
          before: pagination.before
        }
      )
    );
  }

  async getProjectField(
    owner: string,
    ownerType: ProjectOwnerType | undefined,
    projectNumber: number,
    fieldId: number
  ) {
    return await this.withOwner(ownerType, type =>
      this.rest<GitHubRecord>(
        'GET',
        `${this.ownerBase(owner, type)}/${encode(projectNumber)}/fields/${encode(fieldId)}`,
        'get project field',
        'github_get_project_field_failed'
      )
    );
  }

  private async resolveFieldNames(
    owner: string,
    ownerType: ProjectOwnerType,
    projectNumber: number,
    names: string[]
  ) {
    let { value: response } = await this.listProjectFields(owner, ownerType, projectNumber, {
      perPage: 50
    });
    let fields = response.data;
    let ids: string[] = [];
    for (let name of names) {
      let matches = fields.filter(
        field =>
          typeof field.name === 'string' && field.name.toLowerCase() === name.toLowerCase()
      );
      if (matches.length === 0) {
        throw validationError(
          `No project field named "${name}" was found. Available fields: ${
            fields
              .map(field => field.name)
              .filter(Boolean)
              .join(', ') || 'none'
          }.`,
          'github_project_field_not_found'
        );
      }
      if (matches.length > 1) {
        throw validationError(
          `Multiple project fields are named "${name}". Pass numeric field IDs through fields instead.`,
          'github_project_field_ambiguous'
        );
      }
      if (typeof matches[0]?.id !== 'number') {
        throw validationError(
          `Project field "${name}" does not expose a numeric REST ID. Pass its numeric ID through fields instead.`,
          'github_project_field_id_unavailable'
        );
      }
      ids.push(String(matches[0].id));
    }
    return ids;
  }

  async listProjectItems(
    owner: string,
    ownerType: ProjectOwnerType | undefined,
    projectNumber: number,
    options: ProjectsPagination & {
      query?: string;
      fields?: string[];
      fieldNames?: string[];
    }
  ) {
    return await this.withOwner(ownerType, async type => {
      let fields =
        options.fieldNames && options.fieldNames.length > 0
          ? await this.resolveFieldNames(owner, type, projectNumber, options.fieldNames)
          : options.fields;
      let response = await this.restPage<GitHubRecord[]>(
        `${this.ownerBase(owner, type)}/${encode(projectNumber)}/items`,
        'list project items',
        'github_list_project_items_failed',
        {
          q: options.query,
          fields: fields?.join(','),
          per_page: boundedPageSize(options.perPage),
          after: options.after,
          before: options.before
        }
      );
      return {
        items: response.data,
        pageInfo: response.pageInfo
      };
    });
  }

  async getProjectItem(
    owner: string,
    ownerType: ProjectOwnerType | undefined,
    projectNumber: number,
    itemId: number,
    options: { fields?: string[]; fieldNames?: string[] } = {}
  ) {
    return await this.withOwner(ownerType, async type => {
      let fields =
        options.fieldNames && options.fieldNames.length > 0
          ? await this.resolveFieldNames(owner, type, projectNumber, options.fieldNames)
          : options.fields;
      return await this.rest<GitHubRecord>(
        'GET',
        `${this.ownerBase(owner, type)}/${encode(projectNumber)}/items/${encode(itemId)}`,
        'get project item',
        'github_get_project_item_failed',
        { query: { fields: fields?.join(',') } }
      );
    });
  }

  private async resolveOwnerNodeId(owner: string, ownerType: ProjectOwnerType) {
    let query =
      ownerType === 'org'
        ? `query ResolveProjectOwner($login: String!) {
            organization(login: $login) { id }
          }`
        : `query ResolveProjectOwner($login: String!) {
            user(login: $login) { id }
          }`;
    let result = await this.client.requestGraphQL<{
      organization?: { id?: string } | null;
      user?: { id?: string } | null;
    }>(query, { login: owner });
    let id = ownerType === 'org' ? result.organization?.id : result.user?.id;
    if (!id) {
      throw validationError(
        `GitHub ${ownerType === 'org' ? 'organization' : 'user'} "${owner}" was not found.`,
        'github_project_owner_not_found'
      );
    }
    return id;
  }

  private async resolveProjectNodeId(
    owner: string,
    ownerType: ProjectOwnerType,
    projectNumber: number
  ) {
    let query =
      ownerType === 'org'
        ? `query ResolveProject($owner: String!, $projectNumber: Int!) {
            organization(login: $owner) {
              projectV2(number: $projectNumber) { id }
            }
          }`
        : `query ResolveProject($owner: String!, $projectNumber: Int!) {
            user(login: $owner) {
              projectV2(number: $projectNumber) { id }
            }
          }`;
    let result = await this.client.requestGraphQL<{
      organization?: { projectV2?: { id?: string } | null } | null;
      user?: { projectV2?: { id?: string } | null } | null;
    }>(query, { owner, projectNumber });
    let id =
      ownerType === 'org' ? result.organization?.projectV2?.id : result.user?.projectV2?.id;
    if (!id) {
      throw validationError(
        `Project ${owner}#${projectNumber} was not found.`,
        'github_project_not_found'
      );
    }
    return id;
  }

  async createProject(owner: string, ownerType: ProjectOwnerType, title: string) {
    let ownerId = await this.resolveOwnerNodeId(owner, ownerType);
    let result = await this.client.requestGraphQL<{
      createProjectV2?: { projectV2?: GitHubRecord | null } | null;
    }>(
      `mutation CreateProject($input: CreateProjectV2Input!) {
        createProjectV2(input: $input) {
          projectV2 { id number title url public closed shortDescription }
        }
      }`,
      { input: { ownerId, title } }
    );
    let project = result.createProjectV2?.projectV2;
    if (!project) {
      throw validationError(
        'GitHub did not return the created project.',
        'github_create_project_empty'
      );
    }
    return project;
  }

  private async resolveContentNodeId(
    itemType: 'issue' | 'pull_request',
    owner: string,
    repo: string,
    number: number
  ) {
    let field = itemType === 'issue' ? 'issue' : 'pullRequest';
    let result = await this.client.requestGraphQL<{
      repository?: Record<string, { id?: string } | null> | null;
    }>(
      `query ResolveProjectContent(
        $owner: String!
        $repo: String!
        $number: Int!
      ) {
        repository(owner: $owner, name: $repo) {
          ${field}(number: $number) { id }
        }
      }`,
      { owner, repo, number }
    );
    let id = result.repository?.[field]?.id;
    if (!id) {
      throw validationError(
        `GitHub ${itemType.replace('_', ' ')} ${owner}/${repo}#${number} was not found.`,
        'github_project_content_not_found'
      );
    }
    return id;
  }

  async addProjectItem(
    owner: string,
    ownerType: ProjectOwnerType | undefined,
    projectNumber: number,
    item: {
      type: 'issue' | 'pull_request';
      owner: string;
      repo: string;
      number: number;
    }
  ) {
    return await this.withOwner(ownerType, async type => {
      let [projectId, contentId] = await Promise.all([
        this.resolveProjectNodeId(owner, type, projectNumber),
        this.resolveContentNodeId(item.type, item.owner, item.repo, item.number)
      ]);
      let result = await this.client.requestGraphQL<{
        addProjectV2ItemById?: { item?: GitHubRecord | null } | null;
      }>(
        `mutation AddProjectItem($input: AddProjectV2ItemByIdInput!) {
          addProjectV2ItemById(input: $input) {
            item { id fullDatabaseId type }
          }
        }`,
        { input: { projectId, contentId } }
      );
      let added = result.addProjectV2ItemById?.item;
      if (!added) {
        throw validationError(
          'GitHub did not return the added project item.',
          'github_add_project_item_empty'
        );
      }
      return added;
    });
  }

  private async resolveProjectItemIdByIssue(
    projectId: string,
    issueOwner: string,
    issueRepo: string,
    issueNumber: number
  ) {
    let after: string | null = null;
    do {
      let result: ProjectItemsQueryResult =
        await this.client.requestGraphQL<ProjectItemsQueryResult>(
          `query ResolveProjectItem(
          $owner: String!
          $repo: String!
          $issueNumber: Int!
          $after: String
        ) {
          repository(owner: $owner, name: $repo) {
            issue(number: $issueNumber) {
              projectItems(first: 50, after: $after, includeArchived: true) {
                nodes { id fullDatabaseId project { id } }
                pageInfo { hasNextPage endCursor }
              }
            }
          }
        }`,
          { owner: issueOwner, repo: issueRepo, issueNumber, after }
        );
      let connection:
        | NonNullable<
            NonNullable<
              NonNullable<ProjectItemsQueryResult['repository']>['issue']
            >['projectItems']
          >
        | undefined = result.repository?.issue?.projectItems;
      let item = connection?.nodes?.find(candidate => candidate.project?.id === projectId);
      if (item) {
        let id = Number(item.fullDatabaseId);
        if (!Number.isSafeInteger(id)) {
          throw validationError(
            'GitHub returned a project item without a numeric REST ID. Pass item_id directly.',
            'github_project_item_id_unavailable'
          );
        }
        return id;
      }
      if (!connection?.pageInfo?.hasNextPage) {
        break;
      }
      after = connection.pageInfo.endCursor ?? null;
    } while (after);

    throw validationError(
      `${issueOwner}/${issueRepo}#${issueNumber} is not an item on the named project. Add it first with add_project_item.`,
      'github_project_item_not_found'
    );
  }

  private async resolveUpdatedField(
    owner: string,
    ownerType: ProjectOwnerType,
    projectNumber: number,
    update: ProjectItemFieldUpdate
  ) {
    if (!Object.hasOwn(update, 'value')) {
      throw validationError('updated_field.value is required.');
    }
    let hasId = update.id !== undefined;
    let hasName = update.name !== undefined;
    if (hasId === hasName) {
      throw validationError('updated_field must provide exactly one of id or name.');
    }
    if (hasId) {
      if (!Number.isSafeInteger(update.id)) {
        throw validationError('updated_field.id must be an integer.');
      }
      return { id: update.id as number, value: update.value };
    }

    let name = update.name?.trim();
    if (!name) {
      throw validationError('updated_field.name must be a non-empty string.');
    }
    let { value: response } = await this.listProjectFields(owner, ownerType, projectNumber, {
      perPage: 50
    });
    let fields = response.data;
    let matches = fields.filter(
      field =>
        typeof field.name === 'string' && field.name.toLowerCase() === name.toLowerCase()
    );
    if (matches.length !== 1) {
      throw validationError(
        matches.length === 0
          ? `No project field named "${name}" was found.`
          : `Multiple project fields are named "${name}". Pass updated_field.id to disambiguate.`,
        matches.length === 0
          ? 'github_project_field_not_found'
          : 'github_project_field_ambiguous'
      );
    }
    let field = matches[0] as GitHubRecord;
    if (!Number.isSafeInteger(field.id)) {
      throw validationError(
        `Project field "${name}" does not expose a numeric REST ID.`,
        'github_project_field_id_unavailable'
      );
    }

    let value = update.value;
    if (value !== null && String(field.data_type).toLowerCase() === 'single_select') {
      if (typeof value !== 'string' || !value) {
        throw validationError(
          `Single-select field "${name}" requires a non-empty option name or option ID.`,
          'github_project_option_invalid'
        );
      }
      let selectedValue = value;
      let options = Array.isArray(field.options) ? field.options : [];
      let byName = options.find(
        option => optionName(option)?.toLowerCase() === selectedValue.toLowerCase()
      );
      let byId = options.find(option => option.id === selectedValue);
      let option = byName ?? byId;
      if (!option?.id) {
        throw validationError(
          `No option named "${value}" was found for project field "${name}".`,
          'github_project_option_not_found'
        );
      }
      value = option.id;
    }
    return { id: field.id as number, value };
  }

  async updateProjectItem(
    owner: string,
    ownerType: ProjectOwnerType | undefined,
    projectNumber: number,
    item: {
      itemId?: number;
      issue?: { owner: string; repo: string; number: number };
      updatedField: ProjectItemFieldUpdate;
    }
  ) {
    return await this.withOwner(ownerType, async type => {
      let itemId = item.itemId;
      if (itemId === undefined) {
        if (!item.issue) {
          throw validationError(
            'update_project_item requires either item_id or item_owner + item_repo + issue_number.'
          );
        }
        let projectId = await this.resolveProjectNodeId(owner, type, projectNumber);
        itemId = await this.resolveProjectItemIdByIssue(
          projectId,
          item.issue.owner,
          item.issue.repo,
          item.issue.number
        );
      }
      let field = await this.resolveUpdatedField(
        owner,
        type,
        projectNumber,
        item.updatedField
      );
      return await this.rest<GitHubRecord>(
        'PATCH',
        `${this.ownerBase(owner, type)}/${encode(projectNumber)}/items/${encode(itemId)}`,
        'update project item',
        'github_update_project_item_failed',
        { body: { fields: [field] } }
      );
    });
  }

  async deleteProjectItem(
    owner: string,
    ownerType: ProjectOwnerType | undefined,
    projectNumber: number,
    itemId: number
  ) {
    let resolved = await this.withOwner(ownerType, type =>
      this.rest<void>(
        'DELETE',
        `${this.ownerBase(owner, type)}/${encode(projectNumber)}/items/${encode(itemId)}`,
        'delete project item',
        'github_delete_project_item_failed'
      )
    );
    return {
      owner_type: resolved.ownerType,
      item_id: itemId,
      deleted: true
    };
  }

  async listProjectStatusUpdates(
    owner: string,
    ownerType: ProjectOwnerType | undefined,
    projectNumber: number,
    pagination: ProjectsPagination = {}
  ) {
    return await this.withOwner(ownerType, async type => {
      let backwards = Boolean(pagination.before);
      let connection = backwards
        ? 'statusUpdates(last: $pageSize, before: $cursor, orderBy: {field: CREATED_AT, direction: DESC})'
        : 'statusUpdates(first: $pageSize, after: $cursor, orderBy: {field: CREATED_AT, direction: DESC})';
      let ownerField = type === 'org' ? 'organization' : 'user';
      let result = await this.client.requestGraphQL<Record<string, any>>(
        `query ListProjectStatusUpdates(
          $owner: String!
          $projectNumber: Int!
          $pageSize: Int!
          $cursor: String
        ) {
          ${ownerField}(login: $owner) {
            projectV2(number: $projectNumber) {
              public
              ${connection} {
                nodes { id body status createdAt startDate targetDate creator { login } }
                pageInfo { hasNextPage hasPreviousPage endCursor startCursor }
              }
            }
          }
        }`,
        {
          owner,
          projectNumber,
          pageSize: boundedPageSize(pagination.perPage),
          cursor: pagination.before ?? pagination.after ?? null
        }
      );
      let project = result[ownerField]?.projectV2;
      if (!project) {
        throw validationError(
          `Project ${owner}#${projectNumber} was not found.`,
          'github_project_not_found'
        );
      }
      return {
        statusUpdates: project.statusUpdates?.nodes ?? [],
        pageInfo: {
          hasNextPage: project.statusUpdates?.pageInfo?.hasNextPage === true,
          hasPreviousPage: project.statusUpdates?.pageInfo?.hasPreviousPage === true,
          ...(project.statusUpdates?.pageInfo?.endCursor
            ? { nextCursor: project.statusUpdates.pageInfo.endCursor }
            : {}),
          ...(project.statusUpdates?.pageInfo?.startCursor
            ? { prevCursor: project.statusUpdates.pageInfo.startCursor }
            : {})
        }
      };
    });
  }

  async getProjectStatusUpdate(statusUpdateId: string) {
    let result = await this.client.requestGraphQL<{
      node?: GitHubRecord | null;
    }>(
      `query GetProjectStatusUpdate($id: ID!) {
        node(id: $id) {
          ... on ProjectV2StatusUpdate {
            id body status createdAt startDate targetDate creator { login }
            project { public number title url }
          }
        }
      }`,
      { id: statusUpdateId }
    );
    if (!result.node?.id) {
      throw validationError(
        'The status update was not found or the node is not a project status update.',
        'github_project_status_update_not_found'
      );
    }
    return result.node;
  }

  async createProjectStatusUpdate(
    owner: string,
    ownerType: ProjectOwnerType | undefined,
    projectNumber: number,
    input: {
      body?: string;
      status?: string;
      startDate?: string;
      targetDate?: string;
    }
  ) {
    if (input.startDate) {
      ensureDate(input.startDate, 'start_date');
    }
    if (input.targetDate) {
      ensureDate(input.targetDate, 'target_date');
    }
    return await this.withOwner(ownerType, async type => {
      let projectId = await this.resolveProjectNodeId(owner, type, projectNumber);
      let mutationInput: GitHubRecord = { projectId };
      if (input.body !== undefined) {
        mutationInput.body = input.body;
      }
      if (input.status !== undefined) {
        mutationInput.status = input.status;
      }
      if (input.startDate !== undefined) {
        mutationInput.startDate = input.startDate;
      }
      if (input.targetDate !== undefined) {
        mutationInput.targetDate = input.targetDate;
      }
      let result = await this.client.requestGraphQL<{
        createProjectV2StatusUpdate?: { statusUpdate?: GitHubRecord | null } | null;
      }>(
        `mutation CreateProjectStatusUpdate($input: CreateProjectV2StatusUpdateInput!) {
          createProjectV2StatusUpdate(input: $input) {
            statusUpdate {
              id body status createdAt startDate targetDate creator { login }
            }
          }
        }`,
        { input: mutationInput }
      );
      let update = result.createProjectV2StatusUpdate?.statusUpdate;
      if (!update) {
        throw validationError(
          'GitHub did not return the created project status update.',
          'github_create_project_status_update_empty'
        );
      }
      return update;
    });
  }

  async createIterationField(
    owner: string,
    ownerType: ProjectOwnerType | undefined,
    projectNumber: number,
    input: {
      name: string;
      startDate: string;
      duration: number;
      iterations?: ProjectIteration[];
    }
  ) {
    ensureDate(input.startDate, 'start_date');
    if (!Number.isSafeInteger(input.duration) || input.duration < 1) {
      throw validationError('iteration_duration must be a positive integer.');
    }
    for (let [index, iteration] of (input.iterations ?? []).entries()) {
      ensureDate(iteration.start_date, `iterations[${index}].start_date`);
      if (
        !iteration.title.trim() ||
        !Number.isSafeInteger(iteration.duration) ||
        iteration.duration < 1
      ) {
        throw validationError(
          `iterations[${index}] requires a non-empty title and positive integer duration.`
        );
      }
    }
    return await this.withOwner(ownerType, async type => {
      let projectId = await this.resolveProjectNodeId(owner, type, projectNumber);
      let created = await this.client.requestGraphQL<{
        createProjectV2Field?: {
          projectV2Field?: { id?: string; name?: string } | null;
        } | null;
      }>(
        `mutation CreateProjectIterationField($input: CreateProjectV2FieldInput!) {
          createProjectV2Field(input: $input) {
            projectV2Field {
              ... on ProjectV2IterationField { id name }
            }
          }
        }`,
        {
          input: {
            projectId,
            dataType: 'ITERATION',
            name: input.name
          }
        }
      );
      let fieldId = created.createProjectV2Field?.projectV2Field?.id;
      if (!fieldId) {
        throw validationError(
          'GitHub did not return the created iteration field.',
          'github_create_iteration_field_empty'
        );
      }

      let configured: {
        updateProjectV2Field?: {
          projectV2Field?: GitHubRecord | null;
        } | null;
      };
      try {
        configured = await this.client.requestGraphQL(
          `mutation ConfigureProjectIterationField($input: UpdateProjectV2FieldInput!) {
            updateProjectV2Field(input: $input) {
              projectV2Field {
                ... on ProjectV2IterationField {
                  id
                  name
                  configuration {
                    iterations { id title startDate duration }
                  }
                }
              }
            }
          }`,
          {
            input: {
              fieldId,
              iterationConfiguration: {
                startDate: input.startDate,
                duration: input.duration,
                iterations: (input.iterations ?? []).map(iteration => ({
                  title: iteration.title,
                  startDate: iteration.start_date,
                  duration: iteration.duration
                }))
              }
            }
          }
        );
      } catch (error) {
        throw createApiServiceError(
          `GitHub created iteration field "${input.name}" (${fieldId}) but could not configure its schedule. Delete or reconfigure that field in GitHub before retrying.`,
          {
            reason: 'github_configure_iteration_field_failed',
            parent: error
          }
        );
      }
      let field = configured.updateProjectV2Field?.projectV2Field;
      if (!field?.id) {
        throw validationError(
          'GitHub did not return the configured iteration field.',
          'github_configure_iteration_field_empty'
        );
      }
      return field;
    });
  }
}
