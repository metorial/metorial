import { createAxios } from 'slates';
import { azureFunctionsApiError } from './errors';

let API_VERSION = '2024-04-01';
let HOST_FUNCTION_KEY_TYPE = 'functionKeys';

let isFunctionApp = (app: { kind?: string }) =>
  typeof app.kind === 'string' && app.kind.toLowerCase().includes('functionapp');

let normalizeAxiosHeaders = (headers: unknown): Record<string, string> => {
  let raw =
    typeof (headers as { toJSON?: () => Record<string, unknown> })?.toJSON === 'function'
      ? (headers as { toJSON: () => Record<string, unknown> }).toJSON()
      : (headers as Record<string, unknown>);

  return Object.fromEntries(
    Object.entries(raw ?? {}).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(', ') : String(value)
    ])
  );
};

export class ArmClient {
  private axios: ReturnType<typeof createAxios>;
  private subscriptionId: string;
  private resourceGroupName: string;

  constructor(config: { token: string; subscriptionId: string; resourceGroupName: string }) {
    this.subscriptionId = config.subscriptionId;
    this.resourceGroupName = config.resourceGroupName;
    this.axios = createAxios({
      baseURL: 'https://management.azure.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      params: {
        'api-version': API_VERSION
      }
    });
    this.axios.interceptors.response.use(
      response => response,
      error => Promise.reject(azureFunctionsApiError(error))
    );
  }

  private basePath(): string {
    return `/subscriptions/${this.subscriptionId}/resourceGroups/${this.resourceGroupName}/providers/Microsoft.Web/sites`;
  }

  private async paginate<T = any>(
    initialUrl: string,
    filter?: (item: T) => boolean
  ): Promise<T[]> {
    let results: T[] = [];
    let url: string | null = initialUrl;

    while (url) {
      let response: { data: { value?: T[]; nextLink?: string } } = await this.axios.get(url, {
        params: {}
      });
      let page: T[] = response.data.value ?? [];
      results.push(...(filter ? page.filter(filter) : page));
      url = response.data.nextLink ?? null;
    }

    return results;
  }

  // ── Function App Management ──

  async listFunctionApps(): Promise<any[]> {
    return this.paginate<any>(this.basePath(), isFunctionApp);
  }

  async listAllFunctionAppsInSubscription(): Promise<any[]> {
    return this.paginate<any>(
      `/subscriptions/${this.subscriptionId}/providers/Microsoft.Web/sites`,
      isFunctionApp
    );
  }

  async getFunctionApp(appName: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/${appName}`);
    return response.data;
  }

  async createOrUpdateFunctionApp(appName: string, body: any): Promise<any> {
    let response = await this.axios.put(`${this.basePath()}/${appName}`, body);
    return response.data;
  }

  async updateFunctionApp(appName: string, body: any): Promise<any> {
    let response = await this.axios.patch(`${this.basePath()}/${appName}`, body);
    return response.data;
  }

  async deleteFunctionApp(appName: string): Promise<void> {
    await this.axios.delete(`${this.basePath()}/${appName}`);
  }

  async startFunctionApp(appName: string): Promise<void> {
    await this.axios.post(`${this.basePath()}/${appName}/start`);
  }

  async stopFunctionApp(appName: string): Promise<void> {
    await this.axios.post(`${this.basePath()}/${appName}/stop`);
  }

  async restartFunctionApp(appName: string): Promise<void> {
    await this.axios.post(`${this.basePath()}/${appName}/restart`);
  }

  // ── Individual Function Management ──

  async listFunctions(appName: string): Promise<any[]> {
    return this.paginate<any>(`${this.basePath()}/${appName}/functions`);
  }

  async getFunction(appName: string, functionName: string): Promise<any> {
    let response = await this.axios.get(
      `${this.basePath()}/${appName}/functions/${functionName}`
    );
    return response.data;
  }

  async createFunction(appName: string, functionName: string, body: any): Promise<any> {
    let response = await this.axios.put(
      `${this.basePath()}/${appName}/functions/${functionName}`,
      body
    );
    return response.data;
  }

  async deleteFunction(appName: string, functionName: string): Promise<void> {
    await this.axios.delete(`${this.basePath()}/${appName}/functions/${functionName}`);
  }

  // ── Key Management ──

  async listFunctionKeys(appName: string, functionName: string): Promise<any> {
    let response = await this.axios.post(
      `${this.basePath()}/${appName}/functions/${functionName}/listkeys`
    );
    return response.data;
  }

  async createOrUpdateFunctionKey(
    appName: string,
    functionName: string,
    keyName: string,
    keyValue?: string
  ): Promise<any> {
    let body: any = { properties: {} };
    if (keyValue) {
      body.properties.value = keyValue;
    }
    let response = await this.axios.put(
      `${this.basePath()}/${appName}/functions/${functionName}/keys/${keyName}`,
      body
    );
    return response.data;
  }

  async deleteFunctionKey(
    appName: string,
    functionName: string,
    keyName: string
  ): Promise<void> {
    await this.axios.delete(
      `${this.basePath()}/${appName}/functions/${functionName}/keys/${keyName}`
    );
  }

  async listHostKeys(appName: string): Promise<any> {
    let response = await this.axios.post(
      `${this.basePath()}/${appName}/host/default/listkeys`
    );
    return response.data;
  }

  async createOrUpdateHostKey(
    appName: string,
    keyName: string,
    keyValue?: string
  ): Promise<any> {
    let body: any = { properties: {} };
    if (keyValue) {
      body.properties.value = keyValue;
    }
    let response = await this.axios.put(
      `${this.basePath()}/${appName}/host/default/${HOST_FUNCTION_KEY_TYPE}/${keyName}`,
      body
    );
    return response.data;
  }

  async deleteHostKey(appName: string, keyName: string): Promise<void> {
    await this.axios.delete(
      `${this.basePath()}/${appName}/host/default/${HOST_FUNCTION_KEY_TYPE}/${keyName}`
    );
  }

  // ── Application Settings ──

  async listApplicationSettings(appName: string): Promise<any> {
    let response = await this.axios.post(
      `${this.basePath()}/${appName}/config/appsettings/list`
    );
    return response.data;
  }

  async updateApplicationSettings(
    appName: string,
    settings: Record<string, string>
  ): Promise<any> {
    let response = await this.axios.put(`${this.basePath()}/${appName}/config/appsettings`, {
      properties: settings
    });
    return response.data;
  }

  async getConfiguration(appName: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/${appName}/config/web`);
    return response.data;
  }

  async updateConfiguration(appName: string, siteConfig: any): Promise<any> {
    let response = await this.axios.patch(`${this.basePath()}/${appName}/config/web`, {
      properties: siteConfig
    });
    return response.data;
  }

  // ── Deployment Slot Management ──

  async listSlots(appName: string): Promise<any[]> {
    return this.paginate<any>(`${this.basePath()}/${appName}/slots`);
  }

  async getSlot(appName: string, slotName: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/${appName}/slots/${slotName}`);
    return response.data;
  }

  async createOrUpdateSlot(appName: string, slotName: string, body: any): Promise<any> {
    let response = await this.axios.put(
      `${this.basePath()}/${appName}/slots/${slotName}`,
      body
    );
    return response.data;
  }

  async deleteSlot(appName: string, slotName: string): Promise<void> {
    await this.axios.delete(`${this.basePath()}/${appName}/slots/${slotName}`);
  }

  async swapSlotWithProduction(appName: string, slotName: string): Promise<void> {
    await this.axios.post(`${this.basePath()}/${appName}/slotsswap`, {
      targetSlot: slotName
    });
  }

  async swapSlots(
    appName: string,
    sourceSlotName: string,
    targetSlotName: string
  ): Promise<void> {
    await this.axios.post(`${this.basePath()}/${appName}/slots/${sourceSlotName}/slotsswap`, {
      targetSlot: targetSlotName
    });
  }

  // ── Deployment Management ──

  async listDeployments(appName: string): Promise<any[]> {
    return this.paginate<any>(`${this.basePath()}/${appName}/deployments`);
  }

  async getDeployment(appName: string, deploymentId: string): Promise<any> {
    let response = await this.axios.get(
      `${this.basePath()}/${appName}/deployments/${deploymentId}`
    );
    return response.data;
  }

  // ── Monitoring ──

  async getHostStatus(appName: string): Promise<any> {
    let response = await this.axios.get(
      `${this.basePath()}/${appName}/host/default/properties/status`
    );
    return response.data;
  }

  async syncFunctionTriggers(appName: string): Promise<void> {
    await this.axios.post(`${this.basePath()}/${appName}/syncfunctiontriggers`);
  }
}

export class RuntimeClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { appName: string; functionKey: string }) {
    this.axios = createAxios({
      baseURL: `https://${config.appName}.azurewebsites.net`,
      headers: {
        'x-functions-key': config.functionKey
      }
    });
  }

  async invokeFunction(
    functionName: string,
    method: string,
    body?: any,
    queryParams?: Record<string, string>,
    headers?: Record<string, string>
  ): Promise<{ status: number; data: any; headers: Record<string, string> }> {
    let response = await this.axios.request({
      url: `/api/${functionName}`,
      method: method as any,
      data: body,
      params: queryParams,
      headers: headers || {},
      validateStatus: () => true
    });

    return {
      status: response.status,
      data: response.data,
      headers: normalizeAxiosHeaders(response.headers)
    };
  }

  async getAdminHostStatus(): Promise<any> {
    let response = await this.axios.get('/admin/host/status');
    return response.data;
  }
}
