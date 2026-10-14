import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';

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

export interface CorrespondenceStatusParams {
  referenceId: string;
  includeData?: boolean;
}

export interface CreateBatchParams {
  eventType: string;
  generateOnly?: boolean;
  transactionData: Record<string, unknown>[];
  sharedData?: Record<string, unknown>;
}

let requiredString = (data: Record<string, unknown>, keys: string[], operation: string) => {
  for (let key of keys) {
    if (typeof data[key] === 'string' && data[key].trim()) return data[key];
  }
  throw createApiServiceError(
    `Spondyr returned an invalid ${operation} response: missing ${keys[0]}.`,
    {
      reason: 'spondyr_invalid_response'
    }
  );
};

let correspondenceResult = (data: Record<string, unknown>, operation: string) => ({
  referenceId: requiredString(data, ['ReferenceID', 'ReferenceId', 'referenceId'], operation),
  apiStatus: requiredString(data, ['APIStatus', 'apiStatus'], operation)
});

let listResult = (data: unknown, operation: string): Record<string, unknown>[] => {
  let items = Array.isArray(data)
    ? data
    : isApiErrorRecord(data)
      ? (data.Data ?? data.data)
      : undefined;
  if (!Array.isArray(items) || !items.every(isApiErrorRecord)) {
    throw createApiServiceError(
      `Spondyr returned an invalid ${operation} response: expected a Data array.`,
      {
        reason: 'spondyr_invalid_response'
      }
    );
  }
  return items;
};

let optionalString = (data: Record<string, unknown>, key: string) =>
  typeof data[key] === 'string' ? data[key] : undefined;

let optionalNumber = (data: Record<string, unknown>, key: string) => {
  let value = data[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
    return Number(value);
  return undefined;
};

export class SpondyrClient {
  private http;
  private credentials;

  constructor(auth: SpondyrAuth) {
    if (!auth.token.trim() || !auth.applicationToken.trim()) {
      throw createApiServiceError(
        'A Spondyr API key and application token are required. Reconnect your account.',
        {
          reason: 'spondyr_missing_credentials'
        }
      );
    }
    this.credentials = { APIKey: auth.token, ApplicationToken: auth.applicationToken };
    this.http = createAxios({
      baseURL: BASE_URL,
      timeout: 30_000,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
    });
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    operation: string,
    values: Record<string, unknown> = {}
  ) {
    let data = await requestAxiosData<unknown>(
      operation,
      () =>
        this.http.request({
          method,
          url: path,
          ...(method === 'GET'
            ? { params: { ...this.credentials, ...pickDefined(values) } }
            : { data: { ...this.credentials, ...pickDefined(values) } })
        }),
      (error, failedOperation) =>
        buildApiServiceError(error, {
          providerLabel: 'Spondyr',
          reason: 'spondyr_api_error',
          operation: failedOperation,
          detailKeys: ['ErrorMessage', 'errorMessage', 'message', 'error', 'detail'],
          extractResponse: (failure, helpers) => {
            let response = helpers.getResponse(failure);
            if (!helpers.isRecord(failure) || !helpers.isRecord(failure.data)) return response;
            let normalized = failure.data;
            let baggage = helpers.isRecord(normalized.baggage)
              ? normalized.baggage
              : undefined;
            let upstream = helpers.isRecord(normalized.upstream)
              ? normalized.upstream
              : undefined;
            return {
              ...response,
              status:
                response?.status ??
                (typeof upstream?.status === 'number' || typeof upstream?.status === 'string'
                  ? upstream.status
                  : undefined),
              data: baggage?.response ?? response?.data
            };
          },
          extractUpstreamCode: (failure, response, helpers) => {
            if (
              isApiErrorRecord(response?.data) &&
              typeof response.data.APIStatus === 'string'
            ) {
              return response.data.APIStatus;
            }
            if (helpers.isRecord(failure) && helpers.isRecord(failure.data)) {
              let upstream = failure.data.upstream;
              if (helpers.isRecord(upstream) && typeof upstream.code === 'string') {
                return upstream.code;
              }
            }
            return undefined;
          }
        })
    );
    if (isApiErrorRecord(data) && (data.APIStatus ?? data.apiStatus) === 'ERROR') {
      throw buildApiServiceError(
        { response: { status: 200, data } },
        {
          providerLabel: 'Spondyr',
          reason: 'spondyr_api_error',
          operation,
          detailKeys: ['ErrorMessage', 'errorMessage', 'message'],
          extractUpstreamCode: () => 'ERROR',
          fallbackMessage: 'The provider rejected the request.'
        }
      );
    }
    return data;
  }

  private async objectRequest(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    operation: string,
    values: Record<string, unknown>
  ) {
    let data = await this.request(method, path, operation, values);
    if (!isApiErrorRecord(data)) {
      throw createApiServiceError(
        `Spondyr returned an invalid ${operation} response: expected an object.`,
        {
          reason: 'spondyr_invalid_response'
        }
      );
    }
    return data;
  }

  async listTransactionTypes() {
    return listResult(
      await this.request('GET', '/TransactionTypes', 'list transaction types'),
      'transaction types'
    );
  }

  async listEventTypes(transactionType: string) {
    return listResult(
      await this.request('GET', '/EventTypes', 'list event types', {
        TransactionType: transactionType
      }),
      'event types'
    );
  }

  async listTemplates(transactionType: string) {
    return listResult(
      await this.request('GET', '/Templates', 'list templates', {
        TransactionType: transactionType
      }),
      'templates'
    );
  }

  async createCorrespondence(params: CreateCorrespondenceParams) {
    let eventTypes = await this.listEventTypes(params.transactionType);
    if (
      !eventTypes.some(
        event => (event.Name ?? event.name ?? event.eventTypeName) === params.eventType
      )
    ) {
      throw createApiServiceError(
        'The event type does not belong to the selected transaction type. Call list_transaction_types with transactionType to find its event types.',
        {
          reason: 'spondyr_invalid_event_type'
        }
      );
    }
    return correspondenceResult(
      await this.objectRequest('POST', '/Spondyr', 'generate correspondence', {
        EventType: params.eventType,
        IsGenerateOnly: params.isGenerateOnly ?? false,
        Data: params.transactionData
      }),
      'generation'
    );
  }

  async getCorrespondenceStatus(params: CorrespondenceStatusParams) {
    let data = await this.objectRequest('GET', '/Spondyr', 'get correspondence status', {
      ReferenceID: params.referenceId,
      IncludeData: params.includeData ?? false
    });
    let transactionData = data.Data ?? data.data ?? data.transactionData;
    if (transactionData !== undefined && !isApiErrorRecord(transactionData)) {
      throw createApiServiceError(
        'Spondyr returned invalid correspondence transaction data: expected an object.',
        {
          reason: 'spondyr_invalid_response'
        }
      );
    }
    return {
      ...correspondenceResult(data, 'status'),
      createdDate: requiredString(data, ['CreatedDate', 'createdDate'], 'status'),
      transactionData,
      eventType: optionalString(data, 'EventType'),
      statusCode: optionalString(data, 'StatusCode'),
      statusName: optionalString(data, 'StatusName')
    };
  }

  async deliverCorrespondence(params: { referenceId: string }) {
    return correspondenceResult(
      await this.objectRequest('PUT', '/Spondyr', 'deliver correspondence', {
        ReferenceID: params.referenceId
      }),
      'delivery'
    );
  }

  async createBatch(params: CreateBatchParams) {
    return correspondenceResult(
      await this.objectRequest('POST', '/Batch', 'create correspondence batch', {
        EventType: params.eventType,
        IsGenerateOnly: params.generateOnly ?? false,
        SharedData: params.sharedData,
        Data: params.transactionData
      }),
      'batch generation'
    );
  }

  async getBatchStatus(referenceId: string) {
    let data = await this.objectRequest('GET', '/Batch', 'get batch status', {
      ReferenceID: referenceId
    });
    let batchErrors = data.BatchErrors ?? undefined;
    if (
      batchErrors !== undefined &&
      (!Array.isArray(batchErrors) || !batchErrors.every(isApiErrorRecord))
    ) {
      throw createApiServiceError(
        'Spondyr returned invalid batch errors: expected an array of objects.',
        {
          reason: 'spondyr_invalid_response'
        }
      );
    }
    return {
      ...correspondenceResult(data, 'batch status'),
      eventType: optionalString(data, 'EventType'),
      generateOnly: typeof data.IsGenerateOnly === 'boolean' ? data.IsGenerateOnly : undefined,
      statusCode: optionalString(data, 'StatusCode'),
      statusName: optionalString(data, 'StatusName'),
      createdDate: optionalString(data, 'CreatedDate'),
      batchSize: optionalNumber(data, 'BatchSize'),
      totalProcessed: optionalNumber(data, 'TotalProcessed'),
      batchErrors
    };
  }
}
