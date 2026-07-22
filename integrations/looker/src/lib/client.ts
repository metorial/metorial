import { buildApiServiceError, createAxios, getCurrentContext } from 'slates';

import { assertLookerAuthenticatedInstanceUrl, buildLookerApiBaseUrl } from './instance-url';

export type LookerDashboard = {
  id: string;
  title?: string;
  description?: string;
  folder_id?: string;
  user_id?: string | null;
  user_name?: string | null;
  created_at?: string;
  updated_at?: string;
  hidden?: boolean;
  deleted?: boolean;
  dashboard_elements?: Array<{
    id?: string;
    title?: string;
    type?: string;
    look_id?: string;
    query_id?: string;
  }>;
  dashboard_filters?: Array<{
    id?: string;
    name?: string;
    title?: string;
    type?: string;
    default_value?: string;
  }>;
};

type LookerCreateDashboard = {
  title: string;
  folder_id: string;
  description?: string;
  hidden?: boolean;
};

export type LookerUpdateDashboard = {
  title?: string;
  description?: string;
  folder_id?: string;
  hidden?: boolean;
};

export type LookerFolder = {
  id?: string | null;
  name?: string;
  parent_id?: string | null;
  content_metadata_id?: string | null;
  created_at?: string | null;
  creator_id?: string | null;
  child_count?: number | null;
};

export type LookerUpdateFolder = {
  name?: string;
  parent_id?: string;
};

export type LookerUser = {
  id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  email?: string | null;
  is_disabled?: boolean | null;
  locale?: string | null;
  avatar_url?: string | null;
  home_folder_id?: string | null;
  personal_folder_id?: string | null;
  role_ids?: string[] | null;
  group_ids?: string[] | null;
  models_dir_validated?: boolean | null;
  ui_state?: Record<string, unknown> | null;
  can_manage_api3_creds?: boolean | null;
  is_service_account?: boolean | null;
  roles_externally_managed?: boolean | null;
  allow_direct_roles?: boolean | null;
  verified_looker_employee?: boolean | null;
  presumed_looker_employee?: boolean | null;
};

export type LookerWriteUser = {
  first_name?: string;
  home_folder_id?: string;
  is_disabled?: boolean;
  last_name?: string;
  locale?: string;
  models_dir_validated?: boolean;
  ui_state?: Record<string, unknown>;
  can_manage_api3_creds?: boolean;
};

export type LookerWriteEmailCredentials = {
  email?: string;
  forced_password_reset_at_next_login?: boolean;
};

type LookerSearchUsersParams = {
  fields?: string;
  page?: number;
  per_page?: number;
  limit?: number;
  offset?: number;
  sorts?: string;
  id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  verified_looker_employee?: boolean;
  embed_user?: boolean;
  email?: string;
  is_disabled?: boolean;
  filter_or?: boolean;
  content_metadata_id?: string;
  group_id?: string;
  can_manage_api3_creds?: boolean;
  is_service_account?: boolean;
};

export type LookerRole = {
  id?: string | null;
  name?: string | null;
};

export type LookerGroup = {
  id?: string | null;
  can_add_to_content_metadata?: boolean | null;
  contains_current_user?: boolean | null;
  external_group_id?: string | null;
  externally_managed?: boolean | null;
  include_by_default?: boolean | null;
  name?: string | null;
  user_count?: number | null;
};

export type LookerWriteGroup = {
  name?: string;
  can_add_to_content_metadata?: boolean;
};

type LookerSearchGroupsParams = {
  fields?: string;
  limit?: number;
  offset?: number;
  sorts?: string;
  filter_or?: boolean;
  id?: string;
  name?: string;
  external_group_id?: string;
  externally_managed?: boolean;
  externally_orphaned?: boolean;
};

export type LookerScheduledPlanDestination = {
  id?: string;
  scheduled_plan_id?: string | null;
  format?: string | null;
  apply_formatting?: boolean;
  apply_vis?: boolean;
  address?: string | null;
  looker_recipient?: boolean;
  type?: string | null;
  parameters?: string | null;
  secret_parameters?: string | null;
  message?: string | null;
};

export type LookerWriteScheduledPlan = {
  name?: string | null;
  user_id?: string | null;
  run_as_recipient?: boolean;
  enabled?: boolean;
  look_id?: string | null;
  dashboard_id?: string | null;
  lookml_dashboard_id?: string | null;
  filters_string?: string | null;
  require_results?: boolean;
  require_no_results?: boolean;
  require_change?: boolean;
  send_all_results?: boolean;
  crontab?: string | null;
  datagroup?: string | null;
  timezone?: string | null;
  scheduled_plan_destination?: LookerScheduledPlanDestination[] | null;
  run_once?: boolean;
  include_links?: boolean;
  include_dashboard_summary?: boolean;
  custom_url_base?: string | null;
  custom_url_params?: string | null;
  custom_url_label?: string | null;
  show_custom_url?: boolean;
  pdf_paper_size?: string | null;
  pdf_landscape?: boolean;
  embed?: boolean;
  color_theme?: string | null;
  long_tables?: boolean;
  pdf_page_breaks?: boolean;
  tab_ids?: string[] | null;
  inline_table_width?: number | null;
  query_id?: string | null;
};

export type LookerScheduledPlan = LookerWriteScheduledPlan & {
  id?: string;
  created_at?: string | null;
  updated_at?: string | null;
  title?: string | null;
  next_run_at?: string | null;
  last_run_at?: string | null;
};

export type LookerAlertDestination = {
  destination_type: string;
  email_address?: string | null;
  action_hub_integration_id?: string | null;
  action_hub_form_params_json?: string | null;
};

export type LookerAlertFieldFilter = {
  field_name: string;
  field_value: unknown;
  filter_value?: string | null;
};

export type LookerAlertField = {
  title: string;
  name: string;
  filter?: LookerAlertFieldFilter[] | null;
};

export type LookerAlertAppliedDashboardFilter = {
  filter_title: string | null;
  field_name: string;
  filter_value: string;
  filter_description?: string | null;
};

export type LookerWriteAlertAppliedDashboardFilter = Omit<
  LookerAlertAppliedDashboardFilter,
  'filter_description'
>;

export type LookerAlert = {
  applied_dashboard_filters?: LookerAlertAppliedDashboardFilter[] | null;
  comparison_type: string;
  cron: string;
  query_id?: string | null;
  custom_url_base?: string | null;
  custom_url_params?: string | null;
  custom_url_label?: string | null;
  show_custom_url?: boolean;
  custom_title?: string | null;
  dashboard_element_id?: string | null;
  description?: string | null;
  enhancements?: string | null;
  destinations: LookerAlertDestination[] | null;
  field: LookerAlertField;
  followed?: boolean;
  followable?: boolean;
  id?: string;
  is_disabled?: boolean;
  disabled_reason?: string | null;
  is_public?: boolean;
  investigative_content_type?: string | null;
  investigative_content_id?: string | null;
  investigative_content_title?: string | null;
  lookml_dashboard_id?: string | null;
  lookml_link_id?: string | null;
  owner_id: string;
  owner_display_name?: string | null;
  threshold: number;
};

export type LookerWriteAlert = {
  applied_dashboard_filters?: LookerWriteAlertAppliedDashboardFilter[] | null;
  comparison_type: string;
  cron: string;
  query_id?: string | null;
  custom_url_base?: string | null;
  custom_url_params?: string | null;
  custom_url_label?: string | null;
  show_custom_url?: boolean;
  custom_title?: string | null;
  dashboard_element_id?: string | null;
  description?: string | null;
  enhancements?: string | null;
  destinations: LookerAlertDestination[];
  field: LookerAlertField;
  is_disabled?: boolean;
  disabled_reason?: string | null;
  is_public?: boolean;
  investigative_content_type?: string | null;
  investigative_content_id?: string | null;
  lookml_dashboard_id?: string | null;
  lookml_link_id?: string | null;
  owner_id?: string;
  threshold: number;
  time_series_condition_state?: {
    previous_time_series_id?: string | null;
    latest_time_series_id?: string | null;
  };
};

export type LookerFullUpdateAlert = LookerWriteAlert & { owner_id: string };

export type LookerAlertPatch = {
  owner_id?: string;
  is_disabled?: boolean;
  disabled_reason?: string | null;
  is_public?: boolean;
  threshold?: number;
  enhancements?: string | null;
};

type LookerSearchAlertsParams = {
  limit?: number;
  offset?: number;
  group_by?: 'dashboard' | 'owner';
  fields?: string;
  disabled?: boolean;
  frequency?: string;
  condition_met?: boolean;
  last_run_start?: string;
  last_run_end?: string;
  all_owners?: boolean;
};

export type LookerLookmlModelNavExplore = {
  name?: string | null;
  description?: string | null;
  label?: string | null;
  hidden?: boolean | null;
};

export type LookerLookmlModel = {
  name?: string | null;
  label?: string | null;
  project_name?: string | null;
  explores?: LookerLookmlModelNavExplore[] | null;
};

export type LookerLookmlModelExploreField = {
  name?: string | null;
  label?: string | null;
  label_short?: string | null;
  type?: string | null;
  description?: string | null;
};

export type LookerLookmlModelExplore = {
  id?: string | null;
  name?: string | null;
  model_name?: string | null;
  label?: string | null;
  description?: string | null;
  fields?: {
    dimensions?: LookerLookmlModelExploreField[] | null;
    measures?: LookerLookmlModelExploreField[] | null;
    filters?: LookerLookmlModelExploreField[] | null;
    parameters?: LookerLookmlModelExploreField[] | null;
  } | null;
};

export type LookerContentValidationError = {
  message?: string | null;
  field_name?: string | null;
  model_name?: string | null;
  explore_name?: string | null;
  removable?: boolean | null;
};

export type LookerContentValidatorError = {
  look?: {
    id?: string | null;
    title?: string | null;
  } | null;
  dashboard?: {
    id?: string | null;
    title?: string | null;
  } | null;
  dashboard_element?: {
    id?: string | null;
    dashboard_id?: string | null;
    look_id?: string | null;
    title?: string | null;
  } | null;
  dashboard_filter?: {
    id?: string | null;
    dashboard_id?: string | null;
    name?: string | null;
    title?: string | null;
  } | null;
  scheduled_plan?: {
    id?: string | null;
    look_id?: string | null;
    name?: string | null;
  } | null;
  alert?: {
    id?: string | null;
    lookml_dashboard_id?: string | null;
    lookml_link_id?: string | null;
    custom_title?: string | null;
  } | null;
  lookml_dashboard?: {
    id?: string | null;
    title?: string | null;
    space_id?: string | null;
  } | null;
  lookml_dashboard_element?: {
    lookml_link_id?: string | null;
    title?: string | null;
  } | null;
  errors?: LookerContentValidationError[] | null;
  id?: string | null;
};

export type LookerContentValidation = {
  content_with_errors?: LookerContentValidatorError[] | null;
  computation_time?: number | null;
  total_looks_validated?: number | null;
  total_dashboard_elements_validated?: number | null;
  total_dashboard_filters_validated?: number | null;
  total_scheduled_plans_validated?: number | null;
  total_alerts_validated?: number | null;
  total_explores_validated?: number | null;
};

export type LookerProjectError = {
  code?: string | null;
  severity?: string | null;
  kind?: string | null;
  message?: string | null;
  field_name?: string | null;
  file_path?: string | null;
  line_number?: number | null;
  model_id?: string | null;
  explore?: string | null;
  help_url?: string | null;
  params?: Record<string, unknown> | null;
  sanitized_message?: string | null;
};

export type LookerProjectValidation = {
  errors?: LookerProjectError[] | null;
  project_digest?: string | null;
  models_not_validated?: Array<{
    name?: string | null;
    project_file_id?: string | null;
  }> | null;
  computation_time?: number | null;
};

let attachmentMimeTypes: Record<string, string> = {
  csv: 'text/csv',
  txt: 'text/plain',
  html: 'text/html',
  md: 'text/markdown',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  sql: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg'
};

let attachmentMimeType = (resultFormat: string) => attachmentMimeTypes[resultFormat];

let isBinaryResultFormat = (resultFormat: string) =>
  resultFormat === 'xlsx' || resultFormat === 'png' || resultFormat === 'jpg';

let attachmentResult = (content: Buffer, resultFormat: string, mimeType: string) => ({
  results: {
    resultFormat,
    mimeType,
    byteLength: content.byteLength,
    attachmentCount: 1
  },
  attachment: {
    contentBase64: content.toString('base64'),
    mimeType
  }
});

export class LookerClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: {
    instanceUrl: string;
    token: string;
    authenticatedInstanceUrl?: string;
  }) {
    let authenticatedInstanceUrl: unknown = config.authenticatedInstanceUrl;
    if (authenticatedInstanceUrl === undefined) {
      try {
        let auth = getCurrentContext().auth as Record<string, unknown>;
        if (Object.hasOwn(auth, 'authenticatedInstanceUrl')) {
          authenticatedInstanceUrl = auth.authenticatedInstanceUrl;
        }
      } catch {
        // Direct client construction outside an invocation has no Slate context.
      }
    }

    let instanceUrl = assertLookerAuthenticatedInstanceUrl({
      currentInstanceUrl: config.instanceUrl,
      authenticatedInstanceUrl
    });

    this.axios = createAxios({
      baseURL: buildLookerApiBaseUrl(instanceUrl),
      headers: {
        Authorization: `token ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private async requestData<T = unknown>(
    request: () => Promise<{ data: unknown }>,
    operation: string,
    reason: string
  ): Promise<T> {
    try {
      let response = await request();
      return response.data as T;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation,
        reason
      });
    }
  }

  // ─── Queries ───────────────────────────────────────────

  async createQuery(body: {
    model: string;
    view: string;
    fields?: string[];
    pivots?: string[];
    fill_fields?: string[];
    filters?: Record<string, string>;
    sorts?: string[];
    limit?: string;
    column_limit?: string;
    total?: boolean;
    row_total?: string;
    subtotals?: string[];
    dynamic_fields?: string;
    query_timezone?: string;
  }) {
    return this.requestData(
      () => this.axios.post('/queries', body),
      'create a query',
      'looker_create_query_failed'
    );
  }

  async runQuery(queryId: string, resultFormat: string) {
    return this.requestData(
      () =>
        this.axios.get(
          `/queries/${encodeURIComponent(queryId)}/run/${encodeURIComponent(resultFormat)}`
        ),
      'run a saved query',
      'looker_run_query_failed'
    );
  }

  async runInlineQuery(
    body: {
      model: string;
      view: string;
      fields?: string[];
      pivots?: string[];
      fill_fields?: string[];
      filters?: Record<string, string>;
      filter_expression?: string;
      sorts?: string[];
      limit?: string;
      column_limit?: string;
      total?: boolean;
      row_total?: string;
      subtotals?: string[];
      dynamic_fields?: string;
      query_timezone?: string;
    },
    resultFormat: string
  ) {
    try {
      let mimeType = attachmentMimeType(resultFormat);
      let response = await this.axios.post(
        `/queries/run/${resultFormat}`,
        body,
        mimeType
          ? {
              responseType: isBinaryResultFormat(resultFormat) ? 'arraybuffer' : 'text'
            }
          : undefined
      );

      if (!mimeType) {
        return { results: response.data, attachment: undefined };
      }

      let content = Buffer.from(response.data);
      return attachmentResult(content, resultFormat, mimeType);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'run an inline query',
        reason: 'looker_run_inline_query_failed'
      });
    }
  }

  async getQuery(queryId: string) {
    return this.requestData(
      () => this.axios.get(`/queries/${encodeURIComponent(queryId)}`),
      'get a query',
      'looker_get_query_failed'
    );
  }

  // ─── SQL Runner ────────────────────────────────────────

  async createSqlQuery(body: {
    connection_name?: string;
    model_name?: string;
    sql: string;
  }): Promise<{ slug: string }> {
    try {
      let response = await this.axios.post('/sql_queries', body);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'create a SQL Runner query',
        reason: 'looker_create_sql_query_failed'
      });
    }
  }

  async runSqlQuery(slug: string, resultFormat: 'json' | 'csv' | 'txt') {
    try {
      let mimeType = attachmentMimeType(resultFormat);
      let response = await this.axios.post(
        `/sql_queries/${encodeURIComponent(slug)}/run/${encodeURIComponent(resultFormat)}`,
        null,
        mimeType ? { responseType: 'text' } : undefined
      );
      if (!mimeType) {
        return { results: response.data, attachment: undefined };
      }

      return attachmentResult(Buffer.from(response.data), resultFormat, mimeType);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'run a SQL Runner query',
        reason: 'looker_run_sql_query_failed'
      });
    }
  }

  // ─── Looks ─────────────────────────────────────────────

  async searchLooks(params: {
    title?: string;
    description?: string;
    fields?: string;
    page?: number;
    per_page?: number;
    limit?: number;
    offset?: number;
    sorts?: string;
    folder_id?: string;
    filter_or?: boolean;
  }) {
    try {
      let response = await this.axios.get('/looks/search', { params });
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'search Looks',
        reason: 'looker_search_looks_failed'
      });
    }
  }

  async getLook(lookId: string) {
    try {
      let response = await this.axios.get(`/looks/${encodeURIComponent(lookId)}`);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'get a Look',
        reason: 'looker_get_look_failed'
      });
    }
  }

  async createLook(body: {
    title: string;
    description?: string | null;
    folder_id: string;
    query_id?: string | null;
    is_run_on_load?: boolean;
    public?: boolean;
  }) {
    try {
      let response = await this.axios.post('/looks', body);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'create a Look',
        reason: 'looker_create_look_failed'
      });
    }
  }

  async updateLook(
    lookId: string,
    body: {
      title?: string | null;
      description?: string | null;
      folder_id?: string | null;
      query_id?: string | null;
      is_run_on_load?: boolean;
      public?: boolean;
    }
  ) {
    try {
      let response = await this.axios.patch(`/looks/${encodeURIComponent(lookId)}`, body);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'update a Look',
        reason: 'looker_update_look_failed'
      });
    }
  }

  async deleteLook(lookId: string) {
    try {
      let response = await this.axios.delete(`/looks/${encodeURIComponent(lookId)}`);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'permanently delete a Look',
        reason: 'looker_delete_look_failed'
      });
    }
  }

  async runLook(
    lookId: string,
    resultFormat:
      | 'json'
      | 'json_bi'
      | 'json_detail'
      | 'csv'
      | 'txt'
      | 'html'
      | 'md'
      | 'xlsx'
      | 'sql'
      | 'png'
      | 'jpg',
    params?: {
      limit?: number;
      apply_formatting?: boolean;
      apply_vis?: boolean;
    }
  ) {
    try {
      let mimeType = attachmentMimeType(resultFormat);
      let response = await this.axios.get(
        `/looks/${encodeURIComponent(lookId)}/run/${encodeURIComponent(resultFormat)}`,
        {
          params,
          ...(mimeType
            ? {
                responseType: isBinaryResultFormat(resultFormat)
                  ? ('arraybuffer' as const)
                  : ('text' as const)
              }
            : {})
        }
      );

      if (!mimeType) {
        return { results: response.data, attachment: undefined };
      }

      let content = Buffer.from(response.data);
      return attachmentResult(content, resultFormat, mimeType);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'run a Look',
        reason: 'looker_run_look_failed'
      });
    }
  }

  // ─── Dashboards ────────────────────────────────────────

  async searchDashboards(params: {
    title?: string;
    description?: string;
    fields?: string;
    user_id?: string;
    page?: number;
    per_page?: number;
    limit?: number;
    offset?: number;
    sorts?: string;
    folder_id?: string;
    filter_or?: boolean;
    deleted?: string;
  }): Promise<LookerDashboard[]> {
    return this.requestData<LookerDashboard[]>(
      () => this.axios.get('/dashboards/search', { params }),
      'search dashboards',
      'looker_search_dashboards_failed'
    );
  }

  async getDashboard(dashboardId: string): Promise<LookerDashboard> {
    try {
      let response = await this.axios.get(`/dashboards/${encodeURIComponent(dashboardId)}`);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'get a dashboard',
        reason: 'looker_get_dashboard_failed'
      });
    }
  }

  async createDashboard(body: LookerCreateDashboard): Promise<LookerDashboard> {
    try {
      let response = await this.axios.post('/dashboards', body);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'create a dashboard',
        reason: 'looker_create_dashboard_failed'
      });
    }
  }

  async updateDashboard(
    dashboardId: string,
    body: LookerUpdateDashboard
  ): Promise<LookerDashboard> {
    try {
      let response = await this.axios.patch(
        `/dashboards/${encodeURIComponent(dashboardId)}`,
        body
      );
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'update a dashboard',
        reason: 'looker_update_dashboard_failed'
      });
    }
  }

  async deleteDashboard(dashboardId: string): Promise<void> {
    try {
      await this.axios.delete(`/dashboards/${encodeURIComponent(dashboardId)}`);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'permanently delete a dashboard',
        reason: 'looker_delete_dashboard_failed'
      });
    }
  }

  async getDashboardElements(dashboardId: string) {
    return this.requestData(
      () =>
        this.axios.get(`/dashboards/${encodeURIComponent(dashboardId)}/dashboard_elements`),
      'get dashboard elements',
      'looker_get_dashboard_elements_failed'
    );
  }

  async getDashboardFilters(dashboardId: string) {
    return this.requestData(
      () => this.axios.get(`/dashboards/${encodeURIComponent(dashboardId)}/dashboard_filters`),
      'get dashboard filters',
      'looker_get_dashboard_filters_failed'
    );
  }

  // ─── Folders ───────────────────────────────────────────

  async searchFolders(params: {
    name?: string;
    fields?: string;
    page?: number;
    per_page?: number;
    limit?: number;
    offset?: number;
    sorts?: string;
    parent_id?: string;
    filter_or?: boolean;
  }): Promise<LookerFolder[]> {
    try {
      let response = await this.axios.get('/folders/search', { params });
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'search folders',
        reason: 'looker_search_folders_failed'
      });
    }
  }

  async getFolder(folderId: string): Promise<LookerFolder> {
    try {
      let response = await this.axios.get(`/folders/${encodeURIComponent(folderId)}`);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'get a folder',
        reason: 'looker_get_folder_failed'
      });
    }
  }

  async getFolderChildren(
    folderId: string,
    params?: {
      fields?: string;
      page?: number;
      per_page?: number;
      limit?: number;
      offset?: number;
      sorts?: string;
    }
  ): Promise<LookerFolder[]> {
    try {
      let response = await this.axios.get(
        `/folders/${encodeURIComponent(folderId)}/children`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'list child folders',
        reason: 'looker_list_folder_children_failed'
      });
    }
  }

  async createFolder(body: { name: string; parent_id: string }): Promise<LookerFolder> {
    try {
      let response = await this.axios.post('/folders', body);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'create a folder',
        reason: 'looker_create_folder_failed'
      });
    }
  }

  async updateFolder(folderId: string, body: LookerUpdateFolder): Promise<LookerFolder> {
    try {
      let response = await this.axios.patch(`/folders/${encodeURIComponent(folderId)}`, body);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'update a folder',
        reason: 'looker_update_folder_failed'
      });
    }
  }

  async deleteFolder(folderId: string): Promise<void> {
    try {
      await this.axios.delete(`/folders/${encodeURIComponent(folderId)}`);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'permanently delete a folder and its contents',
        reason: 'looker_delete_folder_failed'
      });
    }
  }

  // ─── Users ─────────────────────────────────────────────

  async searchUsers(params: LookerSearchUsersParams): Promise<LookerUser[]> {
    try {
      let response = await this.axios.get('/users/search', { params });
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'search users',
        reason: 'looker_search_users_failed'
      });
    }
  }

  async getUser(userId: string): Promise<LookerUser> {
    try {
      let response = await this.axios.get(`/users/${encodeURIComponent(userId)}`);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'get a user',
        reason: 'looker_get_user_failed'
      });
    }
  }

  async getCurrentUser(): Promise<LookerUser> {
    try {
      let response = await this.axios.get('/user');
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'get the current user',
        reason: 'looker_get_current_user_failed'
      });
    }
  }

  async createUser(body: LookerWriteUser): Promise<LookerUser> {
    try {
      let response = await this.axios.post('/users', body);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'create a user',
        reason: 'looker_create_user_failed'
      });
    }
  }

  async createUserEmailCredentials(
    userId: string,
    body: LookerWriteEmailCredentials
  ): Promise<void> {
    try {
      await this.axios.post(`/users/${encodeURIComponent(userId)}/credentials_email`, body);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'create user email credentials',
        reason: 'looker_create_user_email_credentials_failed'
      });
    }
  }

  async updateUser(userId: string, body: LookerWriteUser): Promise<LookerUser> {
    try {
      let response = await this.axios.patch(`/users/${encodeURIComponent(userId)}`, body);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'update a user',
        reason: 'looker_update_user_failed'
      });
    }
  }

  async updateUserEmailCredentials(
    userId: string,
    body: LookerWriteEmailCredentials
  ): Promise<void> {
    try {
      await this.axios.patch(`/users/${encodeURIComponent(userId)}/credentials_email`, body);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'update user email credentials',
        reason: 'looker_update_user_email_credentials_failed'
      });
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await this.axios.delete(`/users/${encodeURIComponent(userId)}`);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'permanently delete a user',
        reason: 'looker_delete_user_failed'
      });
    }
  }

  async getUserRoles(userId: string): Promise<LookerRole[]> {
    try {
      let response = await this.axios.get(`/users/${encodeURIComponent(userId)}/roles`);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'get user roles',
        reason: 'looker_get_user_roles_failed'
      });
    }
  }

  async setUserRoles(userId: string, roleIds: string[]): Promise<LookerRole[]> {
    try {
      let response = await this.axios.put(
        `/users/${encodeURIComponent(userId)}/roles`,
        roleIds
      );
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'set user roles',
        reason: 'looker_set_user_roles_failed'
      });
    }
  }

  // ─── Groups ────────────────────────────────────────────

  async searchGroups(params: LookerSearchGroupsParams): Promise<LookerGroup[]> {
    try {
      let response = await this.axios.get('/groups/search', { params });
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'search groups',
        reason: 'looker_search_groups_failed'
      });
    }
  }

  async getGroup(groupId: string): Promise<LookerGroup> {
    try {
      let response = await this.axios.get(`/groups/${encodeURIComponent(groupId)}`);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'get a group',
        reason: 'looker_get_group_failed'
      });
    }
  }

  async createGroup(body: LookerWriteGroup): Promise<LookerGroup> {
    try {
      let response = await this.axios.post('/groups', body);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'create a group',
        reason: 'looker_create_group_failed'
      });
    }
  }

  async updateGroup(groupId: string, body: LookerWriteGroup): Promise<LookerGroup> {
    try {
      let response = await this.axios.patch(`/groups/${encodeURIComponent(groupId)}`, body);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'update a group',
        reason: 'looker_update_group_failed'
      });
    }
  }

  async deleteGroup(groupId: string): Promise<void> {
    try {
      await this.axios.delete(`/groups/${encodeURIComponent(groupId)}`);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'permanently delete a group',
        reason: 'looker_delete_group_failed'
      });
    }
  }

  async addGroupUser(groupId: string, userId: string): Promise<LookerUser> {
    try {
      let response = await this.axios.post(`/groups/${encodeURIComponent(groupId)}/users`, {
        user_id: userId
      });
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'add a user to a group',
        reason: 'looker_add_group_user_failed'
      });
    }
  }

  async removeGroupUser(groupId: string, userId: string): Promise<void> {
    try {
      await this.axios.delete(
        `/groups/${encodeURIComponent(groupId)}/users/${encodeURIComponent(userId)}`
      );
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'remove a user from a group',
        reason: 'looker_remove_group_user_failed'
      });
    }
  }

  // ─── Roles ─────────────────────────────────────────────

  async listRoles(params?: {
    fields?: string;
    ids?: string[];
    get_all_support_roles?: boolean;
  }) {
    try {
      let response = await this.axios.get('/roles', {
        params: {
          ...params,
          // DelimArray: Looker expects `ids=1,2`, not repeated `ids[]` params.
          ids: params?.ids && params.ids.length > 0 ? params.ids.join(',') : undefined
        }
      });
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'list roles',
        reason: 'looker_list_roles_failed'
      });
    }
  }

  async getRole(roleId: string) {
    try {
      let response = await this.axios.get(`/roles/${encodeURIComponent(roleId)}`);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'get a role',
        reason: 'looker_get_role_failed'
      });
    }
  }

  // ─── Scheduled Plans ──────────────────────────────────

  async listScheduledPlans(params?: {
    user_id?: string;
    fields?: string;
    all_users?: boolean;
  }): Promise<LookerScheduledPlan[]> {
    try {
      let response = await this.axios.get('/scheduled_plans', { params });
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'list scheduled plans',
        reason: 'looker_list_scheduled_plans_failed'
      });
    }
  }

  async getScheduledPlan(scheduledPlanId: string): Promise<LookerScheduledPlan> {
    try {
      let response = await this.axios.get(
        `/scheduled_plans/${encodeURIComponent(scheduledPlanId)}`
      );
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'get a scheduled plan',
        reason: 'looker_get_scheduled_plan_failed'
      });
    }
  }

  async createScheduledPlan(body: LookerWriteScheduledPlan): Promise<LookerScheduledPlan> {
    try {
      let response = await this.axios.post('/scheduled_plans', body);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'create a scheduled plan',
        reason: 'looker_create_scheduled_plan_failed'
      });
    }
  }

  async updateScheduledPlan(
    scheduledPlanId: string,
    body: LookerWriteScheduledPlan
  ): Promise<LookerScheduledPlan> {
    try {
      let response = await this.axios.patch(
        `/scheduled_plans/${encodeURIComponent(scheduledPlanId)}`,
        body
      );
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'update a scheduled plan',
        reason: 'looker_update_scheduled_plan_failed'
      });
    }
  }

  async deleteScheduledPlan(scheduledPlanId: string): Promise<void> {
    try {
      await this.axios.delete(`/scheduled_plans/${encodeURIComponent(scheduledPlanId)}`);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'permanently delete a scheduled plan',
        reason: 'looker_delete_scheduled_plan_failed'
      });
    }
  }

  async runScheduledPlanOnce(body: LookerWriteScheduledPlan): Promise<LookerScheduledPlan> {
    try {
      let response = await this.axios.post('/scheduled_plans/run_once', body);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'run a scheduled plan once',
        reason: 'looker_run_scheduled_plan_once_failed'
      });
    }
  }

  async getScheduledPlansForLook(
    lookId: string,
    params?: { user_id?: string; fields?: string; all_users?: boolean }
  ): Promise<LookerScheduledPlan[]> {
    try {
      let response = await this.axios.get(
        `/scheduled_plans/look/${encodeURIComponent(lookId)}`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'list scheduled plans for a Look',
        reason: 'looker_list_look_scheduled_plans_failed'
      });
    }
  }

  async getScheduledPlansForDashboard(
    dashboardId: string,
    params?: { user_id?: string; fields?: string; all_users?: boolean }
  ): Promise<LookerScheduledPlan[]> {
    try {
      let response = await this.axios.get(
        `/scheduled_plans/dashboard/${encodeURIComponent(dashboardId)}`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'list scheduled plans for a dashboard',
        reason: 'looker_list_dashboard_scheduled_plans_failed'
      });
    }
  }

  // ─── Alerts ────────────────────────────────────────────

  async listAlerts(params?: LookerSearchAlertsParams): Promise<LookerAlert[]> {
    try {
      let response = await this.axios.get('/alerts/search', { params });
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'search alerts',
        reason: 'looker_search_alerts_failed'
      });
    }
  }

  async getAlert(alertId: string): Promise<LookerAlert> {
    try {
      let response = await this.axios.get(`/alerts/${encodeURIComponent(alertId)}`);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'get an alert',
        reason: 'looker_get_alert_failed'
      });
    }
  }

  async createAlert(body: LookerWriteAlert): Promise<LookerAlert> {
    try {
      let response = await this.axios.post('/alerts', body);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'create an alert',
        reason: 'looker_create_alert_failed'
      });
    }
  }

  async updateAlert(alertId: string, body: LookerFullUpdateAlert): Promise<LookerAlert> {
    try {
      let response = await this.axios.put(`/alerts/${encodeURIComponent(alertId)}`, body);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'update an alert',
        reason: 'looker_update_alert_failed'
      });
    }
  }

  async patchAlert(alertId: string, body: LookerAlertPatch): Promise<LookerAlert> {
    try {
      let response = await this.axios.patch(`/alerts/${encodeURIComponent(alertId)}`, body);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'update select alert fields',
        reason: 'looker_patch_alert_failed'
      });
    }
  }

  async deleteAlert(alertId: string): Promise<void> {
    try {
      await this.axios.delete(`/alerts/${encodeURIComponent(alertId)}`);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'delete an alert',
        reason: 'looker_delete_alert_failed'
      });
    }
  }

  // ─── LookML Models ────────────────────────────────────

  async listLookmlModels(params?: {
    fields?: string;
    limit?: number;
    offset?: number;
    exclude_empty?: boolean;
    exclude_hidden?: boolean;
    include_internal?: boolean;
    include_self_service?: boolean;
  }): Promise<LookerLookmlModel[]> {
    try {
      let response = await this.axios.get('/lookml_models', { params });
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'list LookML models',
        reason: 'looker_list_lookml_models_failed'
      });
    }
  }

  async getLookmlModel(
    modelName: string,
    params?: { fields?: string }
  ): Promise<LookerLookmlModel> {
    try {
      let response = await this.axios.get(`/lookml_models/${encodeURIComponent(modelName)}`, {
        params
      });
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'get a LookML model',
        reason: 'looker_get_lookml_model_failed'
      });
    }
  }

  async getLookmlModelExplore(
    modelName: string,
    exploreName: string,
    params?: {
      fields?: string;
      add_drills_metadata?: boolean;
    }
  ): Promise<LookerLookmlModelExplore> {
    try {
      let response = await this.axios.get(
        `/lookml_models/${encodeURIComponent(modelName)}/explores/${encodeURIComponent(exploreName)}`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'get a LookML model explore',
        reason: 'looker_get_lookml_model_explore_failed'
      });
    }
  }

  // ─── Connections ───────────────────────────────────────

  async listConnections(params?: { fields?: string }) {
    try {
      let response = await this.axios.get('/connections', { params });
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'list database connections',
        reason: 'looker_list_connections_failed'
      });
    }
  }

  async getConnection(connectionName: string, params?: { fields?: string }) {
    try {
      let response = await this.axios.get(
        `/connections/${encodeURIComponent(connectionName)}`,
        {
          params
        }
      );
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'get a database connection',
        reason: 'looker_get_connection_failed'
      });
    }
  }

  async testConnection(connectionName: string, params?: { tests?: string[] }) {
    try {
      let response = await this.axios.put(
        `/connections/${encodeURIComponent(connectionName)}/test`,
        undefined,
        {
          params: {
            // Looker declares `tests` as a DelimArray: one comma-separated
            // value, not repeated `tests[]` params, which Looker ignores.
            tests:
              params?.tests && params.tests.length > 0 ? params.tests.join(',') : undefined
          }
        }
      );
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'test a database connection',
        reason: 'looker_test_connection_failed'
      });
    }
  }

  // ─── Content ───────────────────────────────────────────

  async searchContent(params: {
    terms?: string;
    fields?: string;
    types?: string;
    page?: number;
    per_page?: number;
  }) {
    return this.requestData(
      () => this.axios.get('/content_metadata_access/search', { params }),
      'search content metadata access',
      'looker_search_content_failed'
    );
  }

  async contentFavorites(params?: {
    fields?: string;
    page?: number;
    per_page?: number;
    user_id?: string;
  }) {
    return this.requestData(
      () => this.axios.get('/content_favorite/search', { params }),
      'search content favorites',
      'looker_search_content_favorites_failed'
    );
  }

  async contentValidation(params?: {
    project_names?: string[];
    space_ids?: string[];
  }): Promise<LookerContentValidation> {
    try {
      let response = await this.axios.get('/content_validation', {
        params: {
          project_names:
            params?.project_names && params.project_names.length > 0
              ? params.project_names.join(',')
              : undefined,
          space_ids:
            params?.space_ids && params.space_ids.length > 0
              ? params.space_ids.join(',')
              : undefined
        }
      });
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'validate content',
        reason: 'looker_content_validation_failed'
      });
    }
  }

  // ─── Embedding ─────────────────────────────────────────

  async createSsoEmbedUrl(body: {
    target_url: string;
    session_length?: number;
    force_logout_login?: boolean;
    external_user_id?: string;
    first_name?: string;
    last_name?: string;
    user_timezone?: string | null;
    permissions?: string[];
    models?: string[];
    group_ids?: string[];
    external_group_id?: string;
    user_attributes?: Record<string, unknown>;
    secret_id?: string;
    embed_domain?: string;
  }): Promise<{ url?: string | null }> {
    try {
      let response = await this.axios.post('/embed/sso_url', body);
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'create a signed embed URL',
        reason: 'looker_create_embed_url_failed'
      });
    }
  }

  async createEmbedUrlAsMe(body: {
    target_url: string;
    session_length?: number;
    force_logout_login?: boolean;
  }) {
    return this.requestData(
      () => this.axios.post('/embed/token_url/me', body),
      'create an embed URL for the current user',
      'looker_create_embed_url_as_me_failed'
    );
  }

  // ─── Projects ──────────────────────────────────────────

  async listProjects(params?: { fields?: string }) {
    return this.requestData(
      () => this.axios.get('/projects', { params }),
      'list LookML projects',
      'looker_list_projects_failed'
    );
  }

  async getProject(projectId: string, params?: { fields?: string }) {
    return this.requestData(
      () => this.axios.get(`/projects/${encodeURIComponent(projectId)}`, { params }),
      'get a LookML project',
      'looker_get_project_failed'
    );
  }

  async lookmlValidation(projectId: string): Promise<LookerProjectValidation> {
    try {
      let response = await this.axios.post(
        `/projects/${encodeURIComponent(projectId)}/validate`
      );
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'validate a LookML project',
        reason: 'looker_project_validation_failed'
      });
    }
  }

  // ─── Render Tasks ──────────────────────────────────────

  async createRenderTaskForLook(
    lookId: string,
    resultFormat: string,
    width: number,
    height: number
  ) {
    return this.requestData(
      () =>
        this.axios.post(
          `/render_tasks/looks/${encodeURIComponent(lookId)}/${encodeURIComponent(resultFormat)}`,
          null,
          {
            params: { width, height }
          }
        ),
      'create a Look render task',
      'looker_create_look_render_task_failed'
    );
  }

  async createRenderTaskForDashboard(
    dashboardId: string,
    resultFormat: string,
    width: number,
    height: number,
    body?: {
      dashboard_filters?: string;
      dashboard_style?: string;
    }
  ) {
    return this.requestData(
      () =>
        this.axios.post(
          `/render_tasks/dashboards/${encodeURIComponent(dashboardId)}/${encodeURIComponent(resultFormat)}`,
          body ?? {},
          {
            params: { width, height }
          }
        ),
      'create a dashboard render task',
      'looker_create_dashboard_render_task_failed'
    );
  }

  async getRenderTask(renderTaskId: string) {
    return this.requestData(
      () => this.axios.get(`/render_tasks/${encodeURIComponent(renderTaskId)}`),
      'get a render task',
      'looker_get_render_task_failed'
    );
  }

  async getRenderTaskResults(renderTaskId: string) {
    return this.requestData(
      () =>
        this.axios.get(`/render_tasks/${encodeURIComponent(renderTaskId)}/results`, {
          responseType: 'arraybuffer'
        }),
      'get render task results',
      'looker_get_render_task_results_failed'
    );
  }

  // ─── Themes ────────────────────────────────────────────

  async listThemes(params?: { fields?: string }) {
    return this.requestData(
      () => this.axios.get('/themes', { params }),
      'list themes',
      'looker_list_themes_failed'
    );
  }

  async getActiveThemes(params?: { name?: string; ts?: string; fields?: string }) {
    return this.requestData(
      () => this.axios.get('/themes/active', { params }),
      'get active themes',
      'looker_get_active_themes_failed'
    );
  }

  // ─── Color Collections ─────────────────────────────────

  async listColorCollections(params?: { fields?: string }) {
    return this.requestData(
      () => this.axios.get('/color_collections', { params }),
      'list color collections',
      'looker_list_color_collections_failed'
    );
  }

  // ─── Integrations ─────────────────────────────────────

  async listIntegrationHubs(params?: { fields?: string }) {
    return this.requestData(
      () => this.axios.get('/integration_hubs', { params }),
      'list integration hubs',
      'looker_list_integration_hubs_failed'
    );
  }

  async listIntegrations(params?: { fields?: string; integration_hub_id?: string }) {
    return this.requestData(
      () => this.axios.get('/integrations', { params }),
      'list integrations',
      'looker_list_integrations_failed'
    );
  }

  // ─── Derived Tables ────────────────────────────────────

  async graphDerivedTablesForModel(
    modelName: string,
    params?: {
      format?: string;
      color?: string;
    }
  ) {
    return this.requestData(
      () =>
        this.axios.get(`/derived_table/graph/model/${encodeURIComponent(modelName)}`, {
          params
        }),
      'graph derived tables for a model',
      'looker_graph_derived_tables_failed'
    );
  }

  // ─── Metadata / Explore ────────────────────────────────

  async connectionSchemas(
    connectionName: string,
    params?: {
      database?: string;
      cache?: boolean;
      fields?: string;
    }
  ) {
    try {
      let response = await this.axios.get(
        `/connections/${encodeURIComponent(connectionName)}/schemas`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'list connection schemas',
        reason: 'looker_list_connection_schemas_failed'
      });
    }
  }

  async connectionTables(
    connectionName: string,
    params?: {
      database?: string;
      schema_name?: string;
      cache?: boolean;
      fields?: string;
      table_filter?: string;
      table_limit?: number;
    }
  ) {
    try {
      let response = await this.axios.get(
        `/connections/${encodeURIComponent(connectionName)}/tables`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'list connection tables',
        reason: 'looker_list_connection_tables_failed'
      });
    }
  }

  async connectionColumns(
    connectionName: string,
    params?: {
      database?: string;
      schema_name?: string;
      cache?: boolean;
      table_limit?: number;
      table_names?: string;
      fields?: string;
    }
  ) {
    try {
      let response = await this.axios.get(
        `/connections/${encodeURIComponent(connectionName)}/columns`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Looker',
        operation: 'list connection columns',
        reason: 'looker_list_connection_columns_failed'
      });
    }
  }
}
