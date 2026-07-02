import { createAxios } from 'slates';

let axios = createAxios({
  baseURL: 'https://api.databox.com'
});

export interface DataboxAccount {
  id: number;
  name: string;
  accountType: string;
}

export interface DataboxDataSource {
  id: number;
  title: string;
  created: string;
  timezone: string;
  key: string;
}

export interface DataboxDataset {
  id: string;
  title: string;
  created: string;
}

export interface DataboxIngestion {
  ingestionId: string;
  timestamp: string;
  metrics?: {
    datasetMetrics?: Record<string, unknown>;
    ingestionMetrics?: {
      totalRows?: number;
      validRows?: number;
      invalidRows?: number;
    };
  };
}

export interface DataboxPagination {
  page: number;
  pageSize: number;
  totalItems: number;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      'x-api-key': this.token,
      'Content-Type': 'application/json'
    };
  }

  async validateKey(): Promise<{ requestId: string; status: string }> {
    let response = await axios.get('/v1/auth/validate-key', {
      headers: this.headers()
    });
    return response.data;
  }

  async listAccounts(): Promise<DataboxAccount[]> {
    let response = await axios.get('/v1/accounts', {
      headers: this.headers()
    });
    return response.data.accounts ?? [];
  }

  async listTimezones(): Promise<string[]> {
    let response = await axios.get('/v1/timezones', {
      headers: this.headers()
    });
    return response.data.timezones ?? response.data ?? [];
  }

  async createDataSource(params: {
    accountId: number;
    title: string;
    timezone?: string;
  }): Promise<DataboxDataSource> {
    let response = await axios.post(
      '/v1/data-sources',
      {
        accountId: params.accountId,
        title: params.title,
        timezone: params.timezone ?? 'UTC'
      },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async deleteDataSource(
    dataSourceId: number
  ): Promise<{ requestId: string; status: string; message: string }> {
    let response = await axios.delete(`/v1/data-sources/${dataSourceId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async listDatasets(dataSourceId: number): Promise<DataboxDataset[]> {
    let response = await axios.get(`/v1/data-sources/${dataSourceId}/datasets`, {
      headers: this.headers()
    });
    return response.data.datasets ?? [];
  }

  async createDataset(params: {
    dataSourceId: number;
    title: string;
    primaryKeys?: string[];
  }): Promise<DataboxDataset> {
    let body: Record<string, unknown> = {
      dataSourceId: params.dataSourceId,
      title: params.title
    };
    if (params.primaryKeys && params.primaryKeys.length > 0) {
      body.primaryKeys = params.primaryKeys;
    }
    let response = await axios.post('/v1/datasets', body, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteDataset(
    datasetId: string
  ): Promise<{ requestId: string; status: string; message: string }> {
    let response = await axios.delete(`/v1/datasets/${datasetId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async purgeDataset(
    datasetId: string
  ): Promise<{ requestId: string; status: string; message: string }> {
    let response = await axios.post(
      `/v1/datasets/${datasetId}/purge`,
      {},
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async ingestData(
    datasetId: string,
    records: Record<string, unknown>[]
  ): Promise<{
    requestId: string;
    status: string;
    ingestionId: string;
    message: string;
  }> {
    let response = await axios.post(
      `/v1/datasets/${datasetId}/data`,
      {
        records
      },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async listIngestions(
    datasetId: string,
    params?: {
      page?: number;
      pageSize?: number;
    }
  ): Promise<{
    pagination: DataboxPagination;
    ingestions: DataboxIngestion[];
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);

    let response = await axios.get(`/v1/datasets/${datasetId}/ingestions`, {
      headers: this.headers(),
      params: queryParams
    });
    return {
      pagination: response.data.pagination ?? { page: 1, pageSize: 100, totalItems: 0 },
      ingestions: response.data.ingestions ?? []
    };
  }

  async getIngestionDetails(
    datasetId: string,
    ingestionId: string
  ): Promise<DataboxIngestion> {
    let response = await axios.get(`/v1/datasets/${datasetId}/ingestions/${ingestionId}`, {
      headers: this.headers()
    });
    return response.data;
  }
}
