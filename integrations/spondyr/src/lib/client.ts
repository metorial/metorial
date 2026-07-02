import { createAxios } from 'slates';

let BASE_URL = 'https://client.spondyr.io/api/v1.0.0';

export interface SpondyrAuth {
  token: string;
  applicationToken: string;
}

export interface CreateCorrespondenceParams {
  transactionType: string;
  eventType: string;
  isGenerateOnly?: boolean;
  transactionData: Record<string, unknown>;
}

export interface CreateCorrespondenceResponse {
  referenceId: string;
  apiStatus: string;
  [key: string]: unknown;
}

export interface CorrespondenceStatusParams {
  referenceId: string;
  includeData?: boolean;
}

export interface CorrespondenceStatusResponse {
  apiStatus: string;
  referenceId: string;
  createdDate: string;
  transactionData?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DeliverCorrespondenceParams {
  referenceId: string;
}

export interface DeliverCorrespondenceResponse {
  apiStatus: string;
  referenceId: string;
  [key: string]: unknown;
}

export interface TransactionType {
  transactionTypeId: string;
  transactionTypeName: string;
  [key: string]: unknown;
}

export interface EventType {
  eventTypeId: string;
  eventTypeName: string;
  [key: string]: unknown;
}

export class SpondyrClient {
  private http;
  private apiKey: string;
  private appToken: string;

  constructor(auth: SpondyrAuth) {
    this.apiKey = auth.token;
    this.appToken = auth.applicationToken;
    this.http = createAxios({
      baseURL: BASE_URL
    });
  }

  private authParams() {
    return {
      APIKey: this.apiKey,
      ApplicationToken: this.appToken
    };
  }

  async listTransactionTypes(): Promise<TransactionType[]> {
    let response = await this.http.get('/TransactionTypes', {
      params: this.authParams()
    });
    return response.data;
  }

  async listEventTypes(transactionType: string): Promise<EventType[]> {
    let response = await this.http.get('/TransactionTypes', {
      params: {
        ...this.authParams(),
        TransactionType: transactionType
      }
    });
    return response.data;
  }

  async createCorrespondence(
    params: CreateCorrespondenceParams
  ): Promise<CreateCorrespondenceResponse> {
    let response = await this.http.post(
      '/Send',
      {
        TransactionType: params.transactionType,
        EventType: params.eventType,
        IsGenerateOnly: params.isGenerateOnly ?? false,
        Data: params.transactionData
      },
      {
        params: this.authParams()
      }
    );
    return {
      referenceId:
        response.data.ReferenceId ?? response.data.ReferenceID ?? response.data.referenceId,
      apiStatus: response.data.APIStatus ?? response.data.apiStatus,
      ...response.data
    };
  }

  async getCorrespondenceStatus(
    params: CorrespondenceStatusParams
  ): Promise<CorrespondenceStatusResponse> {
    let response = await this.http.get('/Status', {
      params: {
        ...this.authParams(),
        ReferenceId: params.referenceId,
        IncludeData: params.includeData ?? false
      }
    });
    return {
      apiStatus: response.data.APIStatus ?? response.data.apiStatus,
      referenceId:
        response.data.ReferenceId ?? response.data.ReferenceID ?? response.data.referenceId,
      createdDate: response.data.CreatedDate ?? response.data.createdDate,
      transactionData: response.data.Data ?? response.data.data,
      ...response.data
    };
  }

  async deliverCorrespondence(
    params: DeliverCorrespondenceParams
  ): Promise<DeliverCorrespondenceResponse> {
    let response = await this.http.post(
      '/Deliver',
      {
        ReferenceId: params.referenceId
      },
      {
        params: this.authParams()
      }
    );
    return {
      apiStatus: response.data.APIStatus ?? response.data.apiStatus,
      referenceId:
        response.data.ReferenceId ?? response.data.ReferenceID ?? response.data.referenceId,
      ...response.data
    };
  }
}
