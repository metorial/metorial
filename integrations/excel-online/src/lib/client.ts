import { createAxios } from 'slates';

let XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

let collectErrorMessages = (error: unknown): string[] => {
  let seen = new Set<unknown>();
  let messages = new Set<string>();

  let visit = (value: unknown) => {
    if (value == null || seen.has(value)) {
      return;
    }

    if (typeof value === 'object') {
      seen.add(value);
    }

    if (typeof value === 'string') {
      messages.add(value.toLowerCase());
      return;
    }

    if (typeof value !== 'object') {
      return;
    }

    let record = value as Record<string, unknown>;
    for (let key of ['message', 'detail', 'description']) {
      if (typeof record[key] === 'string') {
        messages.add(String(record[key]).toLowerCase());
      }
    }

    visit(record.data);
    visit(record.error);
    visit(record.response);
    visit(record.cause);
    visit(record.upstream);
  };

  visit(error);

  return Array.from(messages);
};

let isUnsupportedOperationError = (error: unknown) =>
  collectErrorMessages(error).some(message => message.includes('operation not supported'));

export interface ExcelClientConfig {
  token: string;
  driveId?: string;
  siteId?: string;
  sessionId?: string;
}

export class ExcelClient {
  private axios;
  private token: string;
  private driveId?: string;
  private siteId?: string;
  private sessionId?: string;

  constructor(config: ExcelClientConfig) {
    this.token = config.token;
    this.driveId = config.driveId;
    this.siteId = config.siteId;
    this.sessionId = config.sessionId;
    this.axios = createAxios({
      baseURL: 'https://graph.microsoft.com/v1.0'
    });
  }

  private get headers(): Record<string, string> {
    let h: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
    if (this.sessionId) {
      h['workbook-session-id'] = this.sessionId;
    }
    return h;
  }

  private itemPath(workbookItemId: string): string {
    if (this.siteId && this.driveId) {
      return `/sites/${this.siteId}/drives/${this.driveId}/items/${workbookItemId}`;
    }
    if (this.siteId) {
      return `/sites/${this.siteId}/drive/items/${workbookItemId}`;
    }
    if (this.driveId) {
      return `/drives/${this.driveId}/items/${workbookItemId}`;
    }
    return `/me/drive/items/${workbookItemId}`;
  }

  private workbookPath(workbookItemId: string): string {
    return `${this.itemPath(workbookItemId)}/workbook`;
  }

  private drivePath(): string {
    if (this.siteId && this.driveId) {
      return `/sites/${this.siteId}/drives/${this.driveId}`;
    }
    if (this.siteId) {
      return `/sites/${this.siteId}/drive`;
    }
    if (this.driveId) {
      return `/drives/${this.driveId}`;
    }
    return `/me/drive`;
  }

  // ─── Session Management ────────────────────────────────────────────

  async createSession(workbookItemId: string, persistChanges: boolean): Promise<any> {
    let response = await this.axios.post(
      `${this.workbookPath(workbookItemId)}/createSession`,
      { persistChanges },
      { headers: this.headers }
    );
    return response.data;
  }

  async closeSession(workbookItemId: string, sessionId: string): Promise<void> {
    await this.axios.post(
      `${this.workbookPath(workbookItemId)}/closeSession`,
      {},
      {
        headers: {
          ...this.headers,
          'workbook-session-id': sessionId
        }
      }
    );
  }

  async refreshSession(workbookItemId: string, sessionId: string): Promise<void> {
    await this.axios.post(
      `${this.workbookPath(workbookItemId)}/refreshSession`,
      {},
      {
        headers: {
          ...this.headers,
          'workbook-session-id': sessionId
        }
      }
    );
  }

  // ─── Worksheet Management ──────────────────────────────────────────

  async listWorksheets(workbookItemId: string): Promise<any[]> {
    let response = await this.axios.get(`${this.workbookPath(workbookItemId)}/worksheets`, {
      headers: this.headers
    });
    return response.data.value;
  }

  async getWorksheet(workbookItemId: string, worksheetIdOrName: string): Promise<any> {
    let response = await this.axios.get(
      `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async addWorksheet(workbookItemId: string, name?: string): Promise<any> {
    let response = await this.axios.post(
      `${this.workbookPath(workbookItemId)}/worksheets/add`,
      { name },
      { headers: this.headers }
    );
    return response.data;
  }

  async updateWorksheet(
    workbookItemId: string,
    worksheetIdOrName: string,
    properties: { name?: string; position?: number; visibility?: string }
  ): Promise<any> {
    let response = await this.axios.patch(
      `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}`,
      properties,
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteWorksheet(workbookItemId: string, worksheetIdOrName: string): Promise<void> {
    await this.axios.delete(
      `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}`,
      { headers: this.headers }
    );
  }

  // ─── Range Operations ──────────────────────────────────────────────

  async getRange(
    workbookItemId: string,
    worksheetIdOrName: string,
    address: string
  ): Promise<any> {
    let response = await this.axios.get(
      `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/range(address='${encodeURIComponent(address)}')`,
      { headers: this.headers }
    );
    return response.data;
  }

  async getUsedRange(
    workbookItemId: string,
    worksheetIdOrName: string,
    valuesOnly?: boolean
  ): Promise<any> {
    let url = `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/usedRange`;
    if (valuesOnly) {
      url += `(valuesOnly=true)`;
    }
    let response = await this.axios.get(url, { headers: this.headers });
    return response.data;
  }

  async updateRange(
    workbookItemId: string,
    worksheetIdOrName: string,
    address: string,
    data: { values?: any[][]; formulas?: any[][]; numberFormat?: any[][] }
  ): Promise<any> {
    let response = await this.axios.patch(
      `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/range(address='${encodeURIComponent(address)}')`,
      data,
      { headers: this.headers }
    );
    return response.data;
  }

  async clearRange(
    workbookItemId: string,
    worksheetIdOrName: string,
    address: string,
    applyTo?: string
  ): Promise<void> {
    await this.axios.post(
      `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/range(address='${encodeURIComponent(address)}')/clear`,
      { applyTo: applyTo || 'All' },
      { headers: this.headers }
    );
  }

  async sortRange(
    workbookItemId: string,
    worksheetIdOrName: string,
    address: string,
    fields: Array<{ key: number; sortOn?: string; ascending?: boolean }>
  ): Promise<void> {
    await this.axios.post(
      `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/range(address='${encodeURIComponent(address)}')/sort/apply`,
      {
        fields,
        matchCase: false,
        hasHeaders: false,
        orientation: 'Rows',
        method: 'PinYin'
      },
      { headers: this.headers }
    );
  }

  // ─── Table Management ──────────────────────────────────────────────

  async listTables(workbookItemId: string, worksheetIdOrName?: string): Promise<any[]> {
    let url = worksheetIdOrName
      ? `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/tables`
      : `${this.workbookPath(workbookItemId)}/tables`;
    let response = await this.axios.get(url, { headers: this.headers });
    return response.data.value;
  }

  async getTable(workbookItemId: string, tableIdOrName: string): Promise<any> {
    let response = await this.axios.get(
      `${this.workbookPath(workbookItemId)}/tables/${encodeURIComponent(tableIdOrName)}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async createTable(
    workbookItemId: string,
    worksheetIdOrName: string,
    address: string,
    hasHeaders: boolean
  ): Promise<any> {
    let normalizedAddress = address.includes('!')
      ? address
      : `${worksheetIdOrName}!${address}`;
    let response = await this.axios.post(
      `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/tables/add`,
      { address: normalizedAddress, hasHeaders },
      { headers: this.headers }
    );
    return response.data;
  }

  async updateTable(
    workbookItemId: string,
    tableIdOrName: string,
    properties: { name?: string; showHeaders?: boolean; showTotals?: boolean; style?: string }
  ): Promise<any> {
    let response = await this.axios.patch(
      `${this.workbookPath(workbookItemId)}/tables/${encodeURIComponent(tableIdOrName)}`,
      properties,
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteTable(workbookItemId: string, tableIdOrName: string): Promise<void> {
    await this.axios.delete(
      `${this.workbookPath(workbookItemId)}/tables/${encodeURIComponent(tableIdOrName)}`,
      { headers: this.headers }
    );
  }

  async convertTableToRange(workbookItemId: string, tableIdOrName: string): Promise<any> {
    let response = await this.axios.post(
      `${this.workbookPath(workbookItemId)}/tables/${encodeURIComponent(tableIdOrName)}/convertToRange`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async getTableRows(
    workbookItemId: string,
    tableIdOrName: string,
    top?: number,
    skip?: number
  ): Promise<any> {
    let url = `${this.workbookPath(workbookItemId)}/tables/${encodeURIComponent(tableIdOrName)}/rows`;
    let params: string[] = [];
    if (top !== undefined) params.push(`$top=${top}`);
    if (skip !== undefined) params.push(`$skip=${skip}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    let response = await this.axios.get(url, { headers: this.headers });
    return response.data;
  }

  async addTableRows(
    workbookItemId: string,
    tableIdOrName: string,
    values: any[][],
    index?: number
  ): Promise<any> {
    let response = await this.axios.post(
      `${this.workbookPath(workbookItemId)}/tables/${encodeURIComponent(tableIdOrName)}/rows/add`,
      { values, index },
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteTableRow(
    workbookItemId: string,
    tableIdOrName: string,
    rowIndex: number
  ): Promise<void> {
    await this.axios.delete(
      `${this.workbookPath(workbookItemId)}/tables/${encodeURIComponent(tableIdOrName)}/rows/itemAt(index=${rowIndex})`,
      { headers: this.headers }
    );
  }

  async getTableColumns(workbookItemId: string, tableIdOrName: string): Promise<any[]> {
    let response = await this.axios.get(
      `${this.workbookPath(workbookItemId)}/tables/${encodeURIComponent(tableIdOrName)}/columns`,
      { headers: this.headers }
    );
    return response.data.value;
  }

  async addTableColumn(
    workbookItemId: string,
    tableIdOrName: string,
    name: string,
    values?: any[][],
    index?: number
  ): Promise<any> {
    let response = await this.axios.post(
      `${this.workbookPath(workbookItemId)}/tables/${encodeURIComponent(tableIdOrName)}/columns`,
      { name, values, index },
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteTableColumn(
    workbookItemId: string,
    tableIdOrName: string,
    columnIdOrName: string
  ): Promise<void> {
    await this.axios.delete(
      `${this.workbookPath(workbookItemId)}/tables/${encodeURIComponent(tableIdOrName)}/columns/${encodeURIComponent(columnIdOrName)}`,
      { headers: this.headers }
    );
  }

  async applyTableSort(
    workbookItemId: string,
    tableIdOrName: string,
    fields: Array<{ key: number; sortOn?: string; ascending?: boolean }>
  ): Promise<void> {
    await this.axios.post(
      `${this.workbookPath(workbookItemId)}/tables/${encodeURIComponent(tableIdOrName)}/sort/apply`,
      { fields },
      { headers: this.headers }
    );
  }

  async clearTableSort(workbookItemId: string, tableIdOrName: string): Promise<void> {
    await this.axios.post(
      `${this.workbookPath(workbookItemId)}/tables/${encodeURIComponent(tableIdOrName)}/sort/clear`,
      {},
      { headers: this.headers }
    );
  }

  async applyTableFilter(
    workbookItemId: string,
    tableIdOrName: string,
    columnIndex: number,
    criteria: any
  ): Promise<void> {
    let columns = await this.getTableColumns(workbookItemId, tableIdOrName);
    let column = columns[columnIndex];
    if (!column) throw new Error(`Column at index ${columnIndex} not found`);

    await this.axios.post(
      `${this.workbookPath(workbookItemId)}/tables/${encodeURIComponent(tableIdOrName)}/columns/${encodeURIComponent(column.id)}/filter/apply`,
      { criteria },
      { headers: this.headers }
    );
  }

  async clearTableFilters(workbookItemId: string, tableIdOrName: string): Promise<void> {
    await this.axios.post(
      `${this.workbookPath(workbookItemId)}/tables/${encodeURIComponent(tableIdOrName)}/clearFilters`,
      {},
      { headers: this.headers }
    );
  }

  async getTableDataRange(workbookItemId: string, tableIdOrName: string): Promise<any> {
    let response = await this.axios.get(
      `${this.workbookPath(workbookItemId)}/tables/${encodeURIComponent(tableIdOrName)}/dataBodyRange`,
      { headers: this.headers }
    );
    return response.data;
  }

  async getTableHeaderRange(workbookItemId: string, tableIdOrName: string): Promise<any> {
    let response = await this.axios.get(
      `${this.workbookPath(workbookItemId)}/tables/${encodeURIComponent(tableIdOrName)}/headerRowRange`,
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── Chart Operations ──────────────────────────────────────────────

  async listCharts(workbookItemId: string, worksheetIdOrName: string): Promise<any[]> {
    let response = await this.axios.get(
      `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/charts`,
      { headers: this.headers }
    );
    return response.data.value;
  }

  async getChart(
    workbookItemId: string,
    worksheetIdOrName: string,
    chartName: string
  ): Promise<any> {
    let response = await this.axios.get(
      `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/charts/${encodeURIComponent(chartName)}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async createChart(
    workbookItemId: string,
    worksheetIdOrName: string,
    chartType: string,
    sourceDataRange: string,
    seriesBy: string
  ): Promise<any> {
    let response = await this.axios.post(
      `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/charts/add`,
      { type: chartType, sourceData: sourceDataRange, seriesBy },
      { headers: this.headers }
    );
    return response.data;
  }

  async updateChart(
    workbookItemId: string,
    worksheetIdOrName: string,
    chartName: string,
    properties: { name?: string; top?: number; left?: number; width?: number; height?: number }
  ): Promise<any> {
    let response = await this.axios.patch(
      `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/charts/${encodeURIComponent(chartName)}`,
      properties,
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteChart(
    workbookItemId: string,
    worksheetIdOrName: string,
    chartName: string
  ): Promise<void> {
    await this.axios.delete(
      `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/charts/${encodeURIComponent(chartName)}`,
      { headers: this.headers }
    );
  }

  async getChartImage(
    workbookItemId: string,
    worksheetIdOrName: string,
    chartName: string,
    width?: number,
    height?: number,
    fittingMode?: string
  ): Promise<string> {
    let params: string[] = [];
    if (width !== undefined) params.push(`width=${width}`);
    if (height !== undefined) params.push(`height=${height}`);
    if (fittingMode) params.push(`fittingMode='${fittingMode}'`);

    let url = `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/charts/${encodeURIComponent(chartName)}/image`;
    if (params.length > 0) url += `(${params.join(',')})`;

    let response = await this.axios.get(url, { headers: this.headers });
    return response.data.value;
  }

  async setChartSourceData(
    workbookItemId: string,
    worksheetIdOrName: string,
    chartName: string,
    sourceData: string,
    seriesBy?: string
  ): Promise<void> {
    await this.axios.post(
      `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/charts/${encodeURIComponent(chartName)}/setData`,
      { sourceData, seriesBy: seriesBy || 'Auto' },
      { headers: this.headers }
    );
  }

  // ─── Named Items ───────────────────────────────────────────────────

  async listNamedItems(workbookItemId: string, worksheetIdOrName?: string): Promise<any[]> {
    let url = worksheetIdOrName
      ? `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/names`
      : `${this.workbookPath(workbookItemId)}/names`;
    let response = await this.axios.get(url, { headers: this.headers });
    return response.data.value;
  }

  async getNamedItem(workbookItemId: string, name: string): Promise<any> {
    let response = await this.axios.get(
      `${this.workbookPath(workbookItemId)}/names/${encodeURIComponent(name)}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async getNamedItemRange(workbookItemId: string, name: string): Promise<any> {
    let response = await this.axios.get(
      `${this.workbookPath(workbookItemId)}/names/${encodeURIComponent(name)}/range`,
      { headers: this.headers }
    );
    return response.data;
  }

  async addNamedItem(
    workbookItemId: string,
    name: string,
    reference: string,
    comment?: string,
    worksheetIdOrName?: string
  ): Promise<any> {
    let url = worksheetIdOrName
      ? `${this.workbookPath(workbookItemId)}/worksheets/${encodeURIComponent(worksheetIdOrName)}/names/add`
      : `${this.workbookPath(workbookItemId)}/names/add`;
    let response = await this.axios.post(
      url,
      { name, reference, comment },
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── Workbook Functions ────────────────────────────────────────────

  async invokeFunction(
    workbookItemId: string,
    functionName: string,
    params: any[]
  ): Promise<any> {
    let response = await this.axios.post(
      `${this.workbookPath(workbookItemId)}/functions/${functionName}`,
      { values: params },
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── Drive / File Operations ───────────────────────────────────────

  async searchFiles(query: string): Promise<any[]> {
    try {
      let response = await this.axios.get(
        `${this.drivePath()}/root/search(q='${encodeURIComponent(query)}')`,
        { headers: this.headers }
      );
      return response.data.value;
    } catch (error) {
      if (!isUnsupportedOperationError(error)) {
        throw error;
      }

      let items: any[] = [];
      let page = await this.getDelta();

      while (page) {
        if (Array.isArray(page.value)) {
          items.push(...page.value);
        }

        let nextLink =
          typeof page['@odata.nextLink'] === 'string'
            ? page['@odata.nextLink']
            : typeof page.nextLink === 'string'
              ? page.nextLink
              : undefined;
        if (!nextLink) {
          break;
        }

        page = await this.getDelta(undefined, nextLink);
      }

      let normalizedQuery = query.toLowerCase();
      return items.filter(
        item =>
          !item?.deleted &&
          typeof item?.name === 'string' &&
          item.name.toLowerCase().includes(normalizedQuery)
      );
    }
  }

  async getFileMetadata(itemId: string): Promise<any> {
    let response = await this.axios.get(`${this.itemPath(itemId)}`, { headers: this.headers });
    return response.data;
  }

  async listChildren(folderId?: string): Promise<any[]> {
    let url = folderId
      ? `${this.drivePath()}/items/${folderId}/children`
      : `${this.drivePath()}/root/children`;
    let params = {
      $filter: `file/mimeType eq '${XLSX_MIME_TYPE}'`
    };

    try {
      let response = await this.axios.get(url, {
        headers: this.headers,
        params
      });
      return response.data.value;
    } catch (error) {
      if (!isUnsupportedOperationError(error)) {
        throw error;
      }

      let response = await this.axios.get(url, {
        headers: this.headers
      });
      let children: any[] = Array.isArray(response.data.value) ? response.data.value : [];

      return children.filter(
        item =>
          item?.file?.mimeType === XLSX_MIME_TYPE ||
          (typeof item?.name === 'string' && item.name.toLowerCase().endsWith('.xlsx'))
      );
    }
  }

  // ─── Subscriptions (for triggers) ──────────────────────────────────

  async createSubscription(
    resource: string,
    changeType: string,
    notificationUrl: string,
    expirationDateTime: string,
    clientState?: string
  ): Promise<any> {
    let response = await this.axios.post(
      '/subscriptions',
      {
        changeType,
        notificationUrl,
        resource,
        expirationDateTime,
        clientState
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    await this.axios.delete(`/subscriptions/${subscriptionId}`, { headers: this.headers });
  }

  async renewSubscription(subscriptionId: string, expirationDateTime: string): Promise<any> {
    let response = await this.axios.patch(
      `/subscriptions/${subscriptionId}`,
      { expirationDateTime },
      { headers: this.headers }
    );
    return response.data;
  }

  async getDelta(driveId?: string, token?: string): Promise<any> {
    let url: string;
    if (token) {
      url = token;
    } else if (driveId) {
      url = `/drives/${driveId}/root/delta`;
    } else {
      url = `${this.drivePath()}/root/delta`;
    }

    // If it's a full URL (delta link), we need to use it directly
    if (url.startsWith('https://')) {
      let response = await this.axios.get(url, { headers: this.headers });
      return response.data;
    }

    let response = await this.axios.get(url, { headers: this.headers });
    return response.data;
  }
}
