import { createAxios } from 'slates';

let DEFAULT_BASE_URL = 'https://api.draftable.com/v1';

export type ComparisonSide = {
  fileType: string;
  sourceUrl?: string;
  displayName?: string;
};

export type ComparisonResponse = {
  identifier: string;
  left: {
    fileType: string;
    sourceUrl: string | null;
    displayName: string | null;
  };
  right: {
    fileType: string;
    sourceUrl: string | null;
    displayName: string | null;
  };
  isPublic: boolean;
  creationTime: string;
  expiryTime: string | null;
  ready: boolean;
  readyTime: string | null;
  failed: boolean | null;
  errorMessage: string | null;
};

export type ExportResponse = {
  identifier: string;
  comparisonIdentifier: string;
  kind: string;
  url: string | null;
  ready: boolean;
  failed: boolean;
  errorMessage: string | null;
};

export type ListComparisonsResponse = {
  count: number;
  results: ComparisonResponse[];
};

let mapComparison = (data: any): ComparisonResponse => ({
  identifier: data.identifier,
  left: {
    fileType: data.left?.file_type ?? '',
    sourceUrl: data.left?.source_url ?? null,
    displayName: data.left?.display_name ?? null
  },
  right: {
    fileType: data.right?.file_type ?? '',
    sourceUrl: data.right?.source_url ?? null,
    displayName: data.right?.display_name ?? null
  },
  isPublic: data.public ?? false,
  creationTime: data.creation_time ?? '',
  expiryTime: data.expiry_time ?? null,
  ready: data.ready ?? false,
  readyTime: data.ready_time ?? null,
  failed: data.failed ?? null,
  errorMessage: data.error_message ?? null
});

let mapExport = (data: any): ExportResponse => ({
  identifier: data.identifier,
  comparisonIdentifier: data.comparison,
  kind: data.kind,
  url: data.url ?? null,
  ready: data.ready ?? false,
  failed: data.failed ?? false,
  errorMessage: data.error_message ?? null
});

export class Client {
  private baseUrl: string;
  private token: string;

  constructor(config: { token: string; baseUrl?: string }) {
    this.token = config.token;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  }

  private getAxios() {
    return createAxios({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Token ${this.token}`
      }
    });
  }

  async createComparison(params: {
    left: ComparisonSide;
    right: ComparisonSide;
    identifier?: string;
    isPublic?: boolean;
    expiryTime?: string;
  }): Promise<ComparisonResponse> {
    let axios = this.getAxios();

    let body: Record<string, any> = {
      left: {
        file_type: params.left.fileType,
        ...(params.left.sourceUrl ? { source_url: params.left.sourceUrl } : {}),
        ...(params.left.displayName ? { display_name: params.left.displayName } : {})
      },
      right: {
        file_type: params.right.fileType,
        ...(params.right.sourceUrl ? { source_url: params.right.sourceUrl } : {}),
        ...(params.right.displayName ? { display_name: params.right.displayName } : {})
      }
    };

    if (params.identifier) {
      body.identifier = params.identifier;
    }
    if (params.isPublic !== undefined) {
      body.public = params.isPublic;
    }
    if (params.expiryTime) {
      body.expiry_time = params.expiryTime;
    }

    let response = await axios.post('/comparisons', body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return mapComparison(response.data);
  }

  async getComparison(identifier: string): Promise<ComparisonResponse> {
    let axios = this.getAxios();
    let response = await axios.get(`/comparisons/${identifier}`);
    return mapComparison(response.data);
  }

  async listComparisons(params?: {
    limit?: number;
    offset?: number;
  }): Promise<ListComparisonsResponse> {
    let axios = this.getAxios();
    let queryParams: Record<string, any> = {};
    if (params?.limit !== undefined) {
      queryParams.limit = params.limit;
    }
    if (params?.offset !== undefined) {
      queryParams.offset = params.offset;
    }

    let response = await axios.get('/comparisons', { params: queryParams });
    return {
      count: response.data.count ?? response.data.results?.length ?? 0,
      results: (response.data.results ?? []).map(mapComparison)
    };
  }

  async deleteComparison(identifier: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/comparisons/${identifier}`);
  }

  async getChangeDetails(comparisonIdentifier: string): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get(`/comparisons/${comparisonIdentifier}/change-details`);
    return response.data;
  }

  async createExport(params: {
    comparisonIdentifier: string;
    kind: string;
    includeCoverPage?: boolean;
  }): Promise<ExportResponse> {
    let axios = this.getAxios();

    let body: Record<string, any> = {
      comparison: params.comparisonIdentifier,
      kind: params.kind
    };

    if (params.includeCoverPage !== undefined) {
      body.include_cover_page = params.includeCoverPage;
    }

    let response = await axios.post('/exports', body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return mapExport(response.data);
  }

  async getExport(exportIdentifier: string): Promise<ExportResponse> {
    let axios = this.getAxios();
    let response = await axios.get(`/exports/${exportIdentifier}`);
    return mapExport(response.data);
  }
}
