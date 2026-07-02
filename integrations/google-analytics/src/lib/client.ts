import { createAxios } from 'slates';
import { googleAnalyticsApiError } from './errors';
import { accountApiPath, accountResourceName, propertyApiPath } from './properties';

let requestData = async (
  operation: string,
  request: () => Promise<{ data: any }>
): Promise<any> => {
  try {
    let response = await request();
    return response.data;
  } catch (error) {
    throw googleAnalyticsApiError(error, operation);
  }
};

export class AnalyticsDataClient {
  private axios;
  private alphaAxios;

  constructor(config: { token: string }) {
    let headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };

    this.axios = createAxios({
      baseURL: 'https://analyticsdata.googleapis.com/v1beta',
      headers
    });
    this.alphaAxios = createAxios({
      baseURL: 'https://analyticsdata.googleapis.com/v1alpha',
      headers: {
        ...headers
      }
    });
  }

  async runReport(
    propertyId: string,
    params: {
      dateRanges: Array<{ startDate: string; endDate: string }>;
      dimensions?: Array<{ name: string }>;
      metrics: Array<{ name: string }>;
      dimensionFilter?: any;
      metricFilter?: any;
      orderBys?: any[];
      limit?: number;
      offset?: number;
      keepEmptyRows?: boolean;
    }
  ) {
    return requestData('run report', () =>
      this.axios.post(propertyApiPath(propertyId, ':runReport'), params)
    );
  }

  async runRealtimeReport(
    propertyId: string,
    params: {
      dimensions?: Array<{ name: string }>;
      metrics: Array<{ name: string }>;
      dimensionFilter?: any;
      metricFilter?: any;
      limit?: number;
    }
  ) {
    return requestData('run realtime report', () =>
      this.axios.post(propertyApiPath(propertyId, ':runRealtimeReport'), params)
    );
  }

  async runFunnelReport(
    propertyId: string,
    params: {
      dateRanges?: Array<{ startDate: string; endDate: string }>;
      funnel: {
        steps: Array<{
          name: string;
          filterExpression?: any;
          isDirectlyFollowedBy?: boolean;
          withinDurationFromPriorStep?: string;
        }>;
        isOpenFunnel?: boolean;
      };
      funnelBreakdown?: { breakdownDimension: { name: string } };
    }
  ) {
    return requestData('run funnel report', () =>
      this.alphaAxios.post(propertyApiPath(propertyId, ':runFunnelReport'), params)
    );
  }

  async getMetadata(propertyId: string) {
    return requestData('get metadata', () =>
      this.axios.get(propertyApiPath(propertyId, '/metadata'))
    );
  }
}

export class AnalyticsAdminClient {
  private axios;
  private alphaAxios;

  constructor(config: { token: string }) {
    let headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };

    this.axios = createAxios({
      baseURL: 'https://analyticsadmin.googleapis.com/v1beta',
      headers
    });
    this.alphaAxios = createAxios({
      baseURL: 'https://analyticsadmin.googleapis.com/v1alpha',
      headers: {
        ...headers
      }
    });
  }

  async listAccountSummaries(params?: { pageSize?: number; pageToken?: string }) {
    return requestData('list account summaries', () =>
      this.axios.get('/accountSummaries', { params })
    );
  }

  async listAccounts(params?: { pageSize?: number; pageToken?: string }) {
    return requestData('list accounts', () => this.axios.get('/accounts', { params }));
  }

  async getAccount(accountId: string) {
    return requestData('get account', () => this.axios.get(accountApiPath(accountId)));
  }

  async listProperties(params: { accountId: string; pageSize?: number; pageToken?: string }) {
    return requestData('list properties', () =>
      this.axios.get('/properties', {
        params: {
          filter: `parent:${accountResourceName(params.accountId)}`,
          pageSize: params.pageSize,
          pageToken: params.pageToken
        }
      })
    );
  }

  async getProperty(propertyId: string) {
    return requestData('get property', () => this.axios.get(propertyApiPath(propertyId)));
  }

  async updateProperty(propertyId: string, updateMask: string, body: any) {
    return requestData('update property', () =>
      this.axios.patch(propertyApiPath(propertyId), body, {
        params: { updateMask }
      })
    );
  }

  async listDataStreams(
    propertyId: string,
    params?: { pageSize?: number; pageToken?: string }
  ) {
    return requestData('list data streams', () =>
      this.axios.get(propertyApiPath(propertyId, '/dataStreams'), { params })
    );
  }

  async getDataStream(propertyId: string, dataStreamId: string) {
    return requestData('get data stream', () =>
      this.axios.get(propertyApiPath(propertyId, `/dataStreams/${dataStreamId}`))
    );
  }

  async createDataStream(propertyId: string, body: any) {
    return requestData('create data stream', () =>
      this.axios.post(propertyApiPath(propertyId, '/dataStreams'), body)
    );
  }

  async updateDataStream(
    propertyId: string,
    dataStreamId: string,
    updateMask: string,
    body: any
  ) {
    return requestData('update data stream', () =>
      this.axios.patch(propertyApiPath(propertyId, `/dataStreams/${dataStreamId}`), body, {
        params: { updateMask }
      })
    );
  }

  async deleteDataStream(propertyId: string, dataStreamId: string) {
    return requestData('delete data stream', () =>
      this.axios.delete(propertyApiPath(propertyId, `/dataStreams/${dataStreamId}`))
    );
  }

  async listCustomDimensions(
    propertyId: string,
    params?: { pageSize?: number; pageToken?: string }
  ) {
    return requestData('list custom dimensions', () =>
      this.axios.get(propertyApiPath(propertyId, '/customDimensions'), { params })
    );
  }

  async createCustomDimension(
    propertyId: string,
    body: {
      parameterName: string;
      displayName: string;
      description?: string;
      scope: string;
    }
  ) {
    return requestData('create custom dimension', () =>
      this.axios.post(propertyApiPath(propertyId, '/customDimensions'), body)
    );
  }

  async updateCustomDimension(
    propertyId: string,
    customDimensionId: string,
    updateMask: string,
    body: any
  ) {
    return requestData('update custom dimension', () =>
      this.axios.patch(
        propertyApiPath(propertyId, `/customDimensions/${customDimensionId}`),
        body,
        {
          params: { updateMask }
        }
      )
    );
  }

  async archiveCustomDimension(propertyId: string, customDimensionId: string) {
    return requestData('archive custom dimension', () =>
      this.axios.post(
        propertyApiPath(propertyId, `/customDimensions/${customDimensionId}:archive`),
        {}
      )
    );
  }

  async listCustomMetrics(
    propertyId: string,
    params?: { pageSize?: number; pageToken?: string }
  ) {
    return requestData('list custom metrics', () =>
      this.axios.get(propertyApiPath(propertyId, '/customMetrics'), { params })
    );
  }

  async createCustomMetric(
    propertyId: string,
    body: {
      parameterName: string;
      displayName: string;
      description?: string;
      scope: string;
      measurementUnit: string;
    }
  ) {
    return requestData('create custom metric', () =>
      this.axios.post(propertyApiPath(propertyId, '/customMetrics'), body)
    );
  }

  async updateCustomMetric(
    propertyId: string,
    customMetricId: string,
    updateMask: string,
    body: any
  ) {
    return requestData('update custom metric', () =>
      this.axios.patch(propertyApiPath(propertyId, `/customMetrics/${customMetricId}`), body, {
        params: { updateMask }
      })
    );
  }

  async archiveCustomMetric(propertyId: string, customMetricId: string) {
    return requestData('archive custom metric', () =>
      this.axios.post(
        propertyApiPath(propertyId, `/customMetrics/${customMetricId}:archive`),
        {}
      )
    );
  }

  async listAudiences(propertyId: string, params?: { pageSize?: number; pageToken?: string }) {
    return requestData('list audiences', () =>
      this.alphaAxios.get(propertyApiPath(propertyId, '/audiences'), { params })
    );
  }

  async createAudience(propertyId: string, body: any) {
    return requestData('create audience', () =>
      this.alphaAxios.post(propertyApiPath(propertyId, '/audiences'), body)
    );
  }

  async updateAudience(propertyId: string, audienceId: string, updateMask: string, body: any) {
    return requestData('update audience', () =>
      this.alphaAxios.patch(propertyApiPath(propertyId, `/audiences/${audienceId}`), body, {
        params: { updateMask }
      })
    );
  }

  async archiveAudience(propertyId: string, audienceId: string) {
    return requestData('archive audience', () =>
      this.alphaAxios.post(propertyApiPath(propertyId, `/audiences/${audienceId}:archive`), {})
    );
  }

  async listKeyEvents(propertyId: string, params?: { pageSize?: number; pageToken?: string }) {
    return requestData('list key events', () =>
      this.axios.get(propertyApiPath(propertyId, '/keyEvents'), { params })
    );
  }

  async createKeyEvent(
    propertyId: string,
    body: { eventName: string; countingMethod?: string }
  ) {
    return requestData('create key event', () =>
      this.axios.post(propertyApiPath(propertyId, '/keyEvents'), body)
    );
  }

  async getKeyEvent(propertyId: string, keyEventId: string) {
    return requestData('get key event', () =>
      this.axios.get(propertyApiPath(propertyId, `/keyEvents/${keyEventId}`))
    );
  }

  async updateKeyEvent(propertyId: string, keyEventId: string, updateMask: string, body: any) {
    return requestData('update key event', () =>
      this.axios.patch(propertyApiPath(propertyId, `/keyEvents/${keyEventId}`), body, {
        params: { updateMask }
      })
    );
  }

  async deleteKeyEvent(propertyId: string, keyEventId: string) {
    return requestData('delete key event', () =>
      this.axios.delete(propertyApiPath(propertyId, `/keyEvents/${keyEventId}`))
    );
  }

  async listMeasurementProtocolSecrets(
    propertyId: string,
    dataStreamId: string,
    params?: { pageSize?: number; pageToken?: string }
  ) {
    return requestData('list measurement protocol secrets', () =>
      this.axios.get(
        propertyApiPath(propertyId, `/dataStreams/${dataStreamId}/measurementProtocolSecrets`),
        { params }
      )
    );
  }

  async createMeasurementProtocolSecret(
    propertyId: string,
    dataStreamId: string,
    body: { displayName: string }
  ) {
    return requestData('create measurement protocol secret', () =>
      this.axios.post(
        propertyApiPath(propertyId, `/dataStreams/${dataStreamId}/measurementProtocolSecrets`),
        body
      )
    );
  }

  async deleteMeasurementProtocolSecret(
    propertyId: string,
    dataStreamId: string,
    secretId: string
  ) {
    return requestData('delete measurement protocol secret', () =>
      this.axios.delete(
        propertyApiPath(
          propertyId,
          `/dataStreams/${dataStreamId}/measurementProtocolSecrets/${secretId}`
        )
      )
    );
  }

  async runAccessReport(
    propertyId: string,
    params: {
      dateRanges: Array<{ startDate: string; endDate: string }>;
      dimensions?: Array<{ dimensionName: string }>;
      metrics?: Array<{ metricName: string }>;
      limit?: string;
      offset?: string;
    }
  ) {
    return requestData('run access report', () =>
      this.axios.post(propertyApiPath(propertyId, ':runAccessReport'), params)
    );
  }

  async searchChangeHistoryEvents(
    accountId: string,
    params: {
      property?: string;
      earliestChangeTime?: string;
      latestChangeTime?: string;
      resourceType?: string[];
      action?: string[];
      pageSize?: number;
      pageToken?: string;
    }
  ) {
    return requestData('search change history events', () =>
      this.axios.post(accountApiPath(accountId, ':searchChangeHistoryEvents'), params)
    );
  }
}

export class MeasurementProtocolClient {
  private axios;

  constructor(private config: { measurementId: string; apiSecret: string }) {
    this.axios = createAxios({
      baseURL: 'https://www.google-analytics.com'
    });
  }

  async sendEvents(params: {
    clientId: string;
    userId?: string;
    events: Array<{
      name: string;
      params?: Record<string, any>;
    }>;
    userProperties?: Record<string, { value: any }>;
    consent?: {
      adUserData?: string;
      adPersonalization?: string;
    };
  }) {
    return requestData('send measurement protocol events', () =>
      this.axios.post('/mp/collect', params, {
        params: {
          measurement_id: this.config.measurementId,
          api_secret: this.config.apiSecret
        },
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );
  }

  async validateEvents(params: {
    clientId: string;
    userId?: string;
    events: Array<{
      name: string;
      params?: Record<string, any>;
    }>;
    userProperties?: Record<string, { value: any }>;
  }) {
    return requestData('validate measurement protocol events', () =>
      this.axios.post('/debug/mp/collect', params, {
        params: {
          measurement_id: this.config.measurementId,
          api_secret: this.config.apiSecret
        },
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );
  }
}
