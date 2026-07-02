import { createAxios } from 'slates';

export class ProcFuClient {
  private token: string;
  private http;

  constructor(config: { token: string }) {
    this.token = config.token;
    this.http = createAxios({
      baseURL: 'https://procfu.com'
    });
  }

  private buildFormData(params: Record<string, string | undefined>): string {
    let parts: string[] = [];
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }
    return parts.join('&');
  }

  private async callFunction(
    scriptName: string,
    params: Record<string, string | undefined> = {}
  ): Promise<any> {
    let body = this.buildFormData(params);
    let response = await this.http.post(`/exe/${scriptName}`, body, {
      headers: {
        Authorization: `Basic ${this.token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  // ──── Account ────

  async whoami(): Promise<string> {
    let result = await this.callFunction('whoami.pf');
    return typeof result === 'string' ? result.trim() : String(result);
  }

  async getAccountUsage(): Promise<any> {
    return this.callFunction('account_get_usage.pf');
  }

  async getLastError(): Promise<any> {
    return this.callFunction('account_last_error.pf');
  }

  // ──── Podio Items ────

  async getItem(podioItemId: string): Promise<any> {
    return this.callFunction('podio_item_get.pf', { podio_item_id: podioItemId });
  }

  async getItemRaw(podioItemId: string): Promise<any> {
    return this.callFunction('podio_item_get_raw.pf', { podio_item_id: podioItemId });
  }

  async getItemField(podioItemId: string, fieldId: string): Promise<any> {
    return this.callFunction('podio_item_field_get.pf', {
      podio_item_id: podioItemId,
      field_id: fieldId
    });
  }

  async getItemFields(podioItemId: string): Promise<any> {
    return this.callFunction('podio_item_fields_get.pf', { podio_item_id: podioItemId });
  }

  async createItem(
    appId: string,
    fields: string,
    hook?: boolean,
    silent?: boolean
  ): Promise<any> {
    return this.callFunction('podio_item_create.pf', {
      app_id: appId,
      fields,
      hook: hook !== undefined ? String(hook) : undefined,
      silent: silent !== undefined ? String(silent) : undefined
    });
  }

  async updateItemFields(
    podioItemId: string,
    values: string,
    hook?: boolean,
    silent?: boolean
  ): Promise<any> {
    return this.callFunction('podio_item_fields_update.pf', {
      podio_item_id: podioItemId,
      values,
      hook: hook !== undefined ? String(hook) : undefined,
      silent: silent !== undefined ? String(silent) : undefined
    });
  }

  async deleteItem(podioItemId: string): Promise<any> {
    return this.callFunction('podio_item_delete.pf', { podio_item_id: podioItemId });
  }

  async cloneItem(podioItemId: string): Promise<any> {
    return this.callFunction('podio_item_clone.pf', { podio_item_id: podioItemId });
  }

  async getItemIds(podioItemId: string): Promise<any> {
    return this.callFunction('podio_item_get_ids.pf', { podio_item_id: podioItemId });
  }

  async getItemCreator(podioItemId: string): Promise<any> {
    return this.callFunction('podio_item_get_creator.pf', { podio_item_id: podioItemId });
  }

  // ──── Podio Search & Filter ────

  async searchApp(
    appId: string,
    fieldId: string,
    searchVal: string,
    condition: string,
    maxResults?: number,
    simplified?: boolean
  ): Promise<any> {
    return this.callFunction('podio_app_search.pf', {
      app_id: appId,
      field_id: fieldId,
      search_val: searchVal,
      condition,
      max_results: maxResults !== undefined ? String(maxResults) : undefined,
      simplified: simplified ? '1' : undefined
    });
  }

  async filterItems(podioAppId: string, filter: string): Promise<any> {
    return this.callFunction('podio_item_filter.pf', {
      podio_app_id: podioAppId,
      filter
    });
  }

  // ──── Podio Comments ────

  async createComment(
    podioItemId: string,
    value: string,
    hook?: boolean,
    silent?: boolean
  ): Promise<any> {
    return this.callFunction('podio_comment_create.pf', {
      podio_item_id: podioItemId,
      value,
      hook: hook !== undefined ? String(hook) : undefined,
      silent: silent !== undefined ? String(silent) : undefined
    });
  }

  async getCommentRaw(commentId: string): Promise<any> {
    return this.callFunction('podio_comment_get_raw.pf', { comment_id: commentId });
  }

  async deleteComment(commentId: string): Promise<any> {
    return this.callFunction('podio_comment_delete.pf', { comment_id: commentId });
  }

  async getMostRecentComment(podioItemId: string): Promise<any> {
    return this.callFunction('podio_item_comments_most_recent.pf', {
      podio_item_id: podioItemId
    });
  }

  // ──── Podio Apps ────

  async getSpaceApps(spaceId: string): Promise<any> {
    return this.callFunction('podio_space_get_apps.pf', { space_id: spaceId });
  }

  async getAppRaw(appId: string): Promise<any> {
    return this.callFunction('podio_app_get_raw.pf', { app_id: appId });
  }

  async getAppFieldCategories(appId: string, fieldId: string): Promise<any> {
    return this.callFunction('podio_app_field_get_categories.pf', {
      app_id: appId,
      field_id: fieldId
    });
  }

  async getRecentActivity(appId: string): Promise<any> {
    return this.callFunction('podio_app_activity_recent.pf', { app_id: appId });
  }

  // ──── Podio Views ────

  async getView(viewId: string): Promise<any> {
    return this.callFunction('podio_view_get.pf', { view_id: viewId });
  }

  async getViewTotal(viewId: string): Promise<any> {
    return this.callFunction('podio_view_total_get.pf', { view_id: viewId });
  }

  // ──── Podio Workspaces ────

  async getSpaceRaw(spaceId: string): Promise<any> {
    return this.callFunction('podio_space_get_raw.pf', { space_id: spaceId });
  }

  async getSpaceMembers(spaceId: string): Promise<any> {
    return this.callFunction('space_members_get.pf', { space_id: spaceId });
  }

  async getOrganizations(): Promise<any> {
    return this.callFunction('podio_orgs_get_raw.pf');
  }

  // ──── Podio Tasks ────

  async getItemTasks(podioItemId: string): Promise<any> {
    return this.callFunction('podio_item_tasks_get.pf', { podio_item_id: podioItemId });
  }

  async createTask(params: {
    text: string;
    podioItemId?: string;
    spaceId?: string;
    responsible?: string;
    dueDate?: string;
  }): Promise<any> {
    if (params.podioItemId) {
      return this.callFunction('podio_item_task_create.pf', {
        podio_item_id: params.podioItemId,
        text: params.text,
        responsible: params.responsible,
        due_date: params.dueDate
      });
    }
    return this.callFunction('podio_task_create.pf', {
      text: params.text,
      responsible: params.responsible,
      due_date: params.dueDate
    });
  }

  async completeTask(taskId: string): Promise<any> {
    return this.callFunction('podio_task_complete.pf', { task_id: taskId });
  }

  // ──── Variables ────

  async getVariable(varname: string): Promise<any> {
    return this.callFunction('var_get.pf', { varname });
  }

  async setVariable(varname: string, value: string): Promise<any> {
    return this.callFunction('var_set.pf', { varname, value });
  }

  async listVariables(): Promise<any> {
    return this.callFunction('vars_list.pf');
  }

  async incrementVariable(varname: string): Promise<any> {
    return this.callFunction('var_inc.pf', { varname });
  }

  // ──── ProcScript ────

  async callProcScript(scriptname: string, payload?: string): Promise<any> {
    return this.callFunction('call_procscript.pf', {
      scriptname,
      payload
    });
  }

  async callProcScriptBackground(scriptname: string, payload?: string): Promise<any> {
    return this.callFunction('call_procscript_bg.pf', {
      scriptname,
      payload
    });
  }

  // ──── PWA / GlobiFlow ────

  async triggerFlow(flowId: string, podioItemId: string, c: string, p: string): Promise<any> {
    return this.callFunction('pwa_trigger_flow_on_item.pf', {
      flow_id: flowId,
      podio_item_id: podioItemId,
      c,
      p
    });
  }

  async listFlows(): Promise<any> {
    return this.callFunction('pwa_flows_list.pf');
  }

  async getFlowsForSpace(spaceId: string): Promise<any> {
    return this.callFunction('pwa_flows_get_for_space.pf', { space_id: spaceId });
  }

  async getFlow(flowId: string): Promise<any> {
    return this.callFunction('pwa_flow_get.pf', { flow_id: flowId });
  }

  async toggleFlowActive(flowId: string): Promise<any> {
    return this.callFunction('pwa_flow_toggle_active.pf', { flow_id: flowId });
  }

  // ──── MySQL ────

  async mysqlQuery(sql: string, params?: string, connName?: string): Promise<any> {
    return this.callFunction('mysql_query.pf', {
      sql,
      params,
      conn_name: connName
    });
  }

  async mysqlArray(sql: string, params?: string, connName?: string): Promise<any> {
    return this.callFunction('mysql_array.pf', {
      sql,
      params,
      conn_name: connName
    });
  }

  async mysqlCommand(sql: string, params?: string, connName?: string): Promise<any> {
    return this.callFunction('mysql_command.pf', {
      sql,
      params,
      conn_name: connName
    });
  }

  // ──── Raw API Calls ────

  async podioRawCurl(
    url: string,
    method: string,
    options?: string,
    attributes?: string
  ): Promise<any> {
    return this.callFunction('podio_api_raw_curl.pf', {
      url,
      method,
      options,
      attributes
    });
  }

  // ──── OAuth API Services ────

  async sendApiRequest(
    apiService: string,
    userId: string,
    requestUrl: string,
    method: string,
    headers?: string,
    body?: string
  ): Promise<any> {
    return this.callFunction('api_request_send.pf', {
      api_service: apiService,
      user_id: userId,
      request_url: requestUrl,
      method,
      headers,
      body
    });
  }

  async getApiUserTokenStatus(apiService: string, userId: string): Promise<any> {
    return this.callFunction('api_user_token_status.pf', {
      api_service: apiService,
      user_id: userId
    });
  }

  async listApiUsers(apiService: string): Promise<any> {
    return this.callFunction('api_users_list.pf', { api_service: apiService });
  }

  // ──── Data Utilities ────

  async findInJson(json: string, key: string): Promise<any> {
    return this.callFunction('find_in_json.pf', { json, key });
  }

  async base64Encode(text: string): Promise<any> {
    return this.callFunction('base64_encode.pf', { text });
  }

  async markdownToHtml(markdown: string): Promise<any> {
    return this.callFunction('markdown_to_html.pf', { markdown });
  }

  async xmlToJson(xml: string): Promise<any> {
    return this.callFunction('xml_to_json.pf', { xml });
  }

  // ──── Storage ────

  async listStorageFiles(path?: string): Promise<any> {
    return this.callFunction('storage_files_list.pf', { path });
  }

  async getStorageFileBase64(path: string): Promise<any> {
    return this.callFunction('storage_file_get_base64.pf', { path });
  }

  // ──── Notion ────

  async notionPageGet(pageId: string): Promise<any> {
    return this.callFunction('notion_page_get.pf', { page_id: pageId });
  }

  async notionTableQuery(databaseId: string, filter?: string): Promise<any> {
    return this.callFunction('notion_table_query.pf', {
      database_id: databaseId,
      filter
    });
  }

  // ──── Tape ────

  async tapeAppQuery(appId: string, filter?: string): Promise<any> {
    return this.callFunction('tape_app_query.pf', {
      app_id: appId,
      filter
    });
  }

  async tapeRecordGet(recordId: string): Promise<any> {
    return this.callFunction('tape_app_record_get.pf', { record_id: recordId });
  }

  async tapeRecordCreate(appId: string, fields: string): Promise<any> {
    return this.callFunction('tape_app_record_create.pf', {
      app_id: appId,
      fields
    });
  }

  async tapeRecordUpdate(recordId: string, fields: string): Promise<any> {
    return this.callFunction('tape_app_record_update.pf', {
      record_id: recordId,
      fields
    });
  }

  async tapeRecordDelete(recordId: string): Promise<any> {
    return this.callFunction('tape_app_record_delete.pf', { record_id: recordId });
  }

  // ──── OpenAI / ChatGPT ────

  async openAiGpt(prompt: string): Promise<any> {
    return this.callFunction('open_ai_gpt.pf', { prompt });
  }

  // ──── Flow Item Operations (for polling) ────

  async flowItemGet(podioItemId: string): Promise<any> {
    return this.callFunction('flow_item_get.pf', { podio_item_id: podioItemId });
  }

  async flowViewFetch(viewId: string, offset?: string, limit?: string): Promise<any> {
    return this.callFunction('flow_view_fetch.pf', {
      view_id: viewId,
      offset,
      limit
    });
  }

  async flowAppFilter(
    appId: string,
    filter?: string,
    offset?: string,
    limit?: string
  ): Promise<any> {
    return this.callFunction('flow_app_filter.pf', {
      app_id: appId,
      filter,
      offset,
      limit
    });
  }
}
