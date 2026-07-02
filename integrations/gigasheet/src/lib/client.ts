import { createAxios } from 'slates';

export class GigasheetClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.gigasheet.com',
      headers: {
        'X-GIGASHEET-TOKEN': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── User ──────────────────────────────────────────────────────────

  async whoami(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/user/whoami');
    return response.data;
  }

  async getUserDetails(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/user/details');
    return response.data;
  }

  // ── Library / Files ───────────────────────────────────────────────

  async listFiles(parentHandle?: string): Promise<unknown[]> {
    let url = parentHandle ? `/datasets/${parentHandle}` : '/datasets';
    let response = await this.axios.get(url);
    return response.data;
  }

  async listLibrary(parentHandle?: string): Promise<unknown[]> {
    let url = parentHandle ? `/library/${parentHandle}` : '/library';
    let response = await this.axios.get(url);
    return response.data;
  }

  async listSharedWithMe(parentHandle?: string): Promise<unknown[]> {
    let url = parentHandle
      ? `/library/shared-with-me/${parentHandle}`
      : '/library/shared-with-me';
    let response = await this.axios.get(url);
    return response.data;
  }

  async searchLibrary(query: string): Promise<unknown[]> {
    let response = await this.axios.post('/library/search', { query });
    return response.data;
  }

  async getFilePath(handle: string): Promise<unknown> {
    let response = await this.axios.get(`/library/path/${handle}`);
    return response.data;
  }

  // ── Dataset / Sheet Info ──────────────────────────────────────────

  async describeDataset(handle: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/dataset/${handle}`);
    return response.data;
  }

  async getColumns(handle: string): Promise<unknown[]> {
    let response = await this.axios.get(`/dataset/${handle}/columns`);
    return response.data;
  }

  async getDatasetVersion(handle: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/dataset/${handle}/version`);
    return response.data;
  }

  // ── File Management ───────────────────────────────────────────────

  async createBlankFile(params: {
    name: string;
    parentHandle?: string;
    columns?: string[];
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/files/blank', {
      name: params.name,
      parent_handle: params.parentHandle,
      columns: params.columns
    });
    return response.data;
  }

  async createFolder(params: {
    name: string;
    parentHandle?: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/files/directory', {
      name: params.name,
      parent_handle: params.parentHandle
    });
    return response.data;
  }

  async uploadFromUrl(params: {
    url: string;
    name?: string;
    parentHandle?: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/upload/url', {
      url: params.url,
      name: params.name,
      parent_handle: params.parentHandle
    });
    return response.data;
  }

  async copyFile(
    handle: string,
    params?: { name?: string; parentHandle?: string }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/file/${handle}/copy`, {
      name: params?.name,
      parent_handle: params?.parentHandle
    });
    return response.data;
  }

  async renameFile(handle: string, name: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/rename/${handle}`, { name });
    return response.data;
  }

  async moveFile(handle: string, parentHandle: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/file/${handle}/directory`, {
      parent_handle: parentHandle
    });
    return response.data;
  }

  async deleteFile(handle: string): Promise<void> {
    await this.axios.delete(`/delete/${handle}`);
  }

  async combineFiles(
    handles: string[],
    params?: { name?: string; parentHandle?: string }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/files/combine', {
      handles,
      name: params?.name,
      parent_handle: params?.parentHandle
    });
    return response.data;
  }

  // ── Filter / Query ────────────────────────────────────────────────

  async filterData(
    handle: string,
    params: {
      filterModel?: Record<string, unknown>;
      sortModel?: unknown[];
      startRow?: number;
      endRow?: number;
      groupColumns?: string[];
      aggregations?: Record<string, unknown>;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/file/${handle}/filter`, {
      filterModel: params.filterModel,
      sortModel: params.sortModel,
      startRow: params.startRow,
      endRow: params.endRow,
      groupColumns: params.groupColumns,
      aggregations: params.aggregations
    });
    return response.data;
  }

  async countRows(
    handle: string,
    filterModel?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/dataset/${handle}/count-rows`, {
      filterModel
    });
    return response.data;
  }

  async countGroups(
    handle: string,
    params: {
      filterModel?: Record<string, unknown>;
      groupColumns?: string[];
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/dataset/${handle}/count-groups`, {
      filterModel: params.filterModel,
      groupColumns: params.groupColumns
    });
    return response.data;
  }

  // ── Saved Filters ────────────────────────────────────────────────

  async listSavedFilters(): Promise<unknown[]> {
    let response = await this.axios.get('/filter-templates');
    return response.data;
  }

  async getSavedFilter(filterHandle: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/filter-templates/${filterHandle}`);
    return response.data;
  }

  async createOrUpdateSavedFilter(
    filterHandle: string,
    filterData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/filter-templates/${filterHandle}`, filterData);
    return response.data;
  }

  async deleteSavedFilter(filterHandle: string): Promise<void> {
    await this.axios.delete(`/filter-templates/${filterHandle}`);
  }

  async getFilterModelForSheet(
    filterHandle: string,
    sheetHandle: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/filter-templates/${filterHandle}/on-sheet/${sheetHandle}`
    );
    return response.data;
  }

  // ── Aggregations ──────────────────────────────────────────────────

  async getAggregations(
    handle: string,
    params: {
      columns: string[];
      aggregations: Record<string, unknown>;
      filterModel?: Record<string, unknown>;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/file/${handle}/aggregation`, params);
    return response.data;
  }

  // ── Data Manipulation ─────────────────────────────────────────────

  async updateCell(
    handle: string,
    column: string,
    row: string,
    value: unknown
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/dataset/${handle}/${column}/${row}`, { value });
    return response.data;
  }

  async updateCellByName(
    handle: string,
    column: string,
    row: string,
    value: unknown
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/dataset/${handle}/${column}/${row}/by-name`, {
      value
    });
    return response.data;
  }

  async insertBlankRow(handle: string, rowIndex?: number): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/datasets/${handle}/insert-blank-row`, {
      row_index: rowIndex
    });
    return response.data;
  }

  async appendRows(
    handle: string,
    rows: Record<string, unknown>[]
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/dataset/${handle}/append`, { rows });
    return response.data;
  }

  async appendRowsByName(
    handle: string,
    rows: Record<string, unknown>[]
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/dataset/${handle}/append-by-name`, { rows });
    return response.data;
  }

  async appendFromSheet(handle: string, fromHandle: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/dataset/${handle}/append-from-sheet/${fromHandle}-by-name`
    );
    return response.data;
  }

  async upsertRows(
    handle: string,
    column: string,
    row: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(
      `/dataset/${handle}/${column}/${row}/upsert-rows`,
      data
    );
    return response.data;
  }

  async deleteRows(handle: string, rows: string[]): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/dataset/${handle}/delete-rows`, {
      data: { rows }
    });
    return response.data;
  }

  async deleteRowsMatchingFilter(
    handle: string,
    filterModel: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/dataset/${handle}/delete-rows-matching-filter`, {
      data: { filterModel }
    });
    return response.data;
  }

  async deleteRowsNotMatchingFilter(
    handle: string,
    filterModel: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(
      `/dataset/${handle}/delete-rows-not-matching-filter`,
      {
        data: { filterModel }
      }
    );
    return response.data;
  }

  // ── Column Operations ─────────────────────────────────────────────

  async deleteColumn(handle: string, column: string): Promise<void> {
    await this.axios.delete(`/files/${handle}/columns/${column}`);
  }

  async deleteMultipleColumns(
    handle: string,
    columns: string[]
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/files/${handle}/delete-multiple-columns`, {
      columns
    });
    return response.data;
  }

  async renameColumns(
    handle: string,
    renames: Record<string, string>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/dataset/${handle}/rename-columns-by-name`, {
      renames
    });
    return response.data;
  }

  async combineColumns(
    handle: string,
    params: {
      columns: string[];
      separator?: string;
      newColumnName?: string;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/combine-columns/${handle}`, {
      columns: params.columns,
      separator: params.separator,
      new_column_name: params.newColumnName
    });
    return response.data;
  }

  async splitColumn(
    handle: string,
    params: {
      column: string;
      delimiter: string;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/split-column/${handle}`, {
      column: params.column,
      delimiter: params.delimiter
    });
    return response.data;
  }

  async castColumn(
    handle: string,
    column: string,
    dataType: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/cast-column/${handle}/${column}`, {
      data_type: dataType
    });
    return response.data;
  }

  async changeCase(
    handle: string,
    column: string,
    caseType: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/change-case/${handle}/${column}`, {
      case_type: caseType
    });
    return response.data;
  }

  async trimWhitespace(handle: string, column: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/trim-whitespace/${handle}/${column}`);
    return response.data;
  }

  async extractDomain(handle: string, column: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/extract-domain/${handle}/${column}`);
    return response.data;
  }

  async explodeJson(handle: string, column: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/explode-json/${handle}/${column}`);
    return response.data;
  }

  async unrollDelimitedColumn(
    handle: string,
    column: string,
    params?: { delimiter?: string }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/unroll-delimited-column/${handle}/${column}`, {
      delimiter: params?.delimiter
    });
    return response.data;
  }

  // ── Formulas ──────────────────────────────────────────────────────

  async runFormula(
    handle: string,
    params: {
      formula: string;
      newColumnName?: string;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/dataset/${handle}/formula`, {
      formula: params.formula,
      new_column_name: params.newColumnName
    });
    return response.data;
  }

  async validateFormula(handle: string, formula: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/dataset/${handle}/formula/validate`, { formula });
    return response.data;
  }

  async previewFormula(handle: string, formula: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/dataset/${handle}/formula/preview`, { formula });
    return response.data;
  }

  // ── Find & Replace ────────────────────────────────────────────────

  async findAndReplace(
    handle: string,
    params: {
      find: string;
      replace: string;
      column?: string;
      caseSensitive?: boolean;
      matchWholeCell?: boolean;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/dataset/${handle}/find-and-replace`, {
      find: params.find,
      replace: params.replace,
      column: params.column,
      case_sensitive: params.caseSensitive,
      match_whole_cell: params.matchWholeCell
    });
    return response.data;
  }

  // ── Export ────────────────────────────────────────────────────────

  async createExport(
    handle: string,
    params?: {
      filterModel?: Record<string, unknown>;
      groupColumns?: string[];
      format?: string;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/dataset/${handle}/export`, {
      filterModel: params?.filterModel,
      groupColumns: params?.groupColumns,
      format: params?.format
    });
    return response.data;
  }

  async downloadExport(
    handle: string,
    exportHandle: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/dataset/${handle}/download/${exportHandle}`);
    return response.data;
  }

  async getOperationStatus(handle: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/dataset/${handle}/operation-status`);
    return response.data;
  }

  async listExports(): Promise<unknown[]> {
    let response = await this.axios.get('/library/exports');
    return response.data;
  }

  // ── Sharing ───────────────────────────────────────────────────────

  async shareFile(
    handle: string,
    params: {
      emails: string[];
      permission?: string;
      message?: string;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/file/${handle}/share-file`, {
      emails: params.emails,
      permission: params.permission,
      message: params.message
    });
    return response.data;
  }

  async createLiveShare(handle: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/dataset/${handle}/liveshare`);
    return response.data;
  }

  async listLiveShares(handle: string): Promise<unknown[]> {
    let response = await this.axios.get(`/dataset/${handle}/liveshares`);
    return response.data;
  }

  async deleteLiveShare(shareId: string): Promise<void> {
    await this.axios.delete(`/dataset/liveshare/${shareId}`);
  }

  async getOrganizationPermissions(handle: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/dataset/${handle}/organization-permissions`);
    return response.data;
  }

  async setOrganizationPermissions(
    handle: string,
    permissions: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(
      `/dataset/${handle}/organization-permissions`,
      permissions
    );
    return response.data;
  }

  // ── Views ─────────────────────────────────────────────────────────

  async listViews(handle: string): Promise<unknown[]> {
    let response = await this.axios.get(`/dataset/${handle}/views`);
    return response.data;
  }

  async getView(handle: string, viewId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/dataset/${handle}/views/${viewId}`);
    return response.data;
  }

  async createView(
    handle: string,
    params: {
      name: string;
      filterModel?: Record<string, unknown>;
      sortModel?: unknown[];
      columnState?: unknown[];
      groupColumns?: string[];
      aggregations?: Record<string, unknown>;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/dataset/${handle}/views`, params);
    return response.data;
  }

  async updateView(
    handle: string,
    viewId: string,
    params: {
      name?: string;
      filterModel?: Record<string, unknown>;
      sortModel?: unknown[];
      columnState?: unknown[];
      groupColumns?: string[];
      aggregations?: Record<string, unknown>;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.patch(`/dataset/${handle}/views/${viewId}`, params);
    return response.data;
  }

  async deleteView(handle: string, viewId: string): Promise<void> {
    await this.axios.delete(`/dataset/${handle}/views/${viewId}`);
  }

  async createLinkedSheetFromView(
    handle: string,
    viewId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/dataset/${handle}/views/${viewId}/as-linked-sheet`);
    return response.data;
  }

  // ── Comments ──────────────────────────────────────────────────────

  async getAllComments(handle: string): Promise<unknown[]> {
    let response = await this.axios.get(`/dataset/${handle}/comments`);
    return response.data;
  }

  async getColumnComments(handle: string): Promise<unknown[]> {
    let response = await this.axios.get(`/dataset/${handle}/column-comments`);
    return response.data;
  }

  async addColumnComment(
    handle: string,
    params: {
      column: string;
      comment: string;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/dataset/${handle}/column-comment`, {
      column: params.column,
      comment: params.comment
    });
    return response.data;
  }

  async deleteColumnComment(handle: string, commentId: string): Promise<void> {
    await this.axios.delete(`/dataset/${handle}/column-comment/${commentId}`);
  }

  async getCellComments(handle: string, column: string, row: string): Promise<unknown[]> {
    let response = await this.axios.get(`/dataset/${handle}/${column}/${row}/comments`);
    return response.data;
  }

  async addCellComment(
    handle: string,
    column: string,
    row: string,
    comment: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/dataset/${handle}/${column}/${row}/comment`, {
      comment
    });
    return response.data;
  }

  async deleteCellComment(
    handle: string,
    column: string,
    row: string,
    commentId: string
  ): Promise<void> {
    await this.axios.delete(`/dataset/${handle}/${column}/${row}/comment/${commentId}`);
  }

  // ── AI ────────────────────────────────────────────────────────────

  async chatWithAssistant(handle: string, message: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/ai/${handle}/chat`, { message });
    return response.data;
  }

  async formulaBuilder(handle: string, prompt: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/ai/${handle}/formulate`, { prompt });
    return response.data;
  }

  async getAssistantHistory(handle: string): Promise<unknown[]> {
    let response = await this.axios.get(`/ai/${handle}/logs`);
    return response.data;
  }

  async deleteAssistantHistory(handle: string): Promise<void> {
    await this.axios.delete(`/ai/${handle}/logs`);
  }

  // ── Cross-File Lookup ─────────────────────────────────────────────

  async crossFileLookup(
    handle: string,
    column: string,
    params: {
      lookupSheetHandle: string;
      lookupColumn: string;
      returnColumns?: string[];
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/lookup/${handle}/${column}`, {
      lookup_sheet_handle: params.lookupSheetHandle,
      lookup_column: params.lookupColumn,
      return_columns: params.returnColumns
    });
    return response.data;
  }

  // ── Deduplication ─────────────────────────────────────────────────

  async countDuplicates(handle: string, columns?: string[]): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/datasets/${handle}/deduplicate-rows/count`, {
      columns
    });
    return response.data;
  }

  async deleteDuplicates(
    handle: string,
    columns?: string[]
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/datasets/${handle}/deduplicate-rows`, {
      data: { columns }
    });
    return response.data;
  }

  // ── Enrichment ────────────────────────────────────────────────────

  async enrichEmail(handle: string, column: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/enrich/email-format-check/${handle}/${column}`);
    return response.data;
  }

  async enrichGeo(handle: string, column: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/enrich/geo/${handle}/${column}`);
    return response.data;
  }

  async enrichOnDemand(handle: string, column: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/enrich/on-demand/${handle}/${column}`);
    return response.data;
  }

  async applyHttpEnrichment(
    handle: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/enrich/user-defined-http/${handle}/apply`, params);
    return response.data;
  }

  async previewHttpEnrichment(
    handle: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/enrich/user-defined-http/${handle}/preview`,
      params
    );
    return response.data;
  }

  async listEnrichmentTasks(): Promise<unknown[]> {
    let response = await this.axios.get('/enrich/user-defined-http/tasks');
    return response.data;
  }

  async getEnrichmentTaskStatus(taskHandle: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/enrich/user-defined-http/task/${taskHandle}`);
    return response.data;
  }

  async cancelEnrichmentTask(taskHandle: string): Promise<void> {
    await this.axios.post(`/enrich/user-defined-http/task/${taskHandle}/cancel`);
  }

  // ── Audit ─────────────────────────────────────────────────────────

  async getActivityHistory(handle: string): Promise<unknown[]> {
    let response = await this.axios.get(`/datasets/${handle}/activity`);
    return response.data;
  }

  async searchActivityHistory(handle: string, query: string): Promise<unknown[]> {
    let response = await this.axios.post(`/datasets/${handle}/activity/search`, { query });
    return response.data;
  }

  async getActivityCount(handle: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/datasets/${handle}/activity/count`);
    return response.data;
  }

  // ── Client State ──────────────────────────────────────────────────

  async setClientState(
    handle: string,
    state: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/dataset/${handle}/clientstate`, state);
    return response.data;
  }

  async setFilterModel(
    handle: string,
    filterModel: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/client-state/${handle}/filter-model`, {
      filterModel
    });
    return response.data;
  }

  async setSortModel(handle: string, sortModel: unknown[]): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/client-state/${handle}/sort-model`, { sortModel });
    return response.data;
  }

  async setVisibleColumns(
    handle: string,
    columns: string[]
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/client-state/${handle}/visible-columns`, {
      columns
    });
    return response.data;
  }

  async setGroupColumns(handle: string, columns: string[]): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/client-state/${handle}/group-columns`, { columns });
    return response.data;
  }

  async resetClientState(handle: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/client-state/${handle}/reset`);
    return response.data;
  }

  // ── Notes ─────────────────────────────────────────────────────────

  async getNote(handle: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/dataset/${handle}/note`);
    return response.data;
  }

  async setNote(handle: string, note: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/dataset/${handle}/note`, { note });
    return response.data;
  }

  // ── Connectors ────────────────────────────────────────────────────

  async listConnections(): Promise<unknown[]> {
    let response = await this.axios.get('/connectors/connections');
    return response.data;
  }

  async getConnection(connectionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/connectors/connection/${connectionId}`);
    return response.data;
  }

  async createConnection(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/connectors/connection/create', params);
    return response.data;
  }

  async runConnection(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/connectors/create', params);
    return response.data;
  }

  async pauseConnector(connectionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.patch(`/connectors/pause/${connectionId}`);
    return response.data;
  }

  async unpauseConnector(connectionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.patch(`/connectors/unpause/${connectionId}`);
    return response.data;
  }

  async exportToConnector(
    handle: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/connectors/${handle}/export`, params);
    return response.data;
  }

  async getDataSources(): Promise<unknown[]> {
    let response = await this.axios.get('/connectors/sources');
    return response.data;
  }

  // ── Clean Company Name ────────────────────────────────────────────

  async cleanCompanyName(handle: string, column: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/clean-company-name/${handle}/${column}`);
    return response.data;
  }

  // ── Upload Raw Data ───────────────────────────────────────────────

  async uploadDirect(params: {
    data: string;
    name?: string;
    parentHandle?: string;
    format?: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/upload/direct', {
      data: params.data,
      name: params.name,
      parent_handle: params.parentHandle,
      format: params.format
    });
    return response.data;
  }

  // ── Space Used ────────────────────────────────────────────────────

  async getSpaceUsed(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/user/space-used');
    return response.data;
  }

  async getEnrichmentCredits(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/user/enrichment-credits');
    return response.data;
  }

  // ── Formula Functions ─────────────────────────────────────────────

  async getFormulaFunctions(): Promise<unknown[]> {
    let response = await this.axios.get('/docs/formulas/functions');
    return response.data;
  }
}
