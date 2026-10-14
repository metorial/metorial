import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';

export type PrinterInput = {
  name: string;
  paperSizes: { name: string; height: number; width: number; rawKind: string }[];
};

export type DocumentResultInput = {
  id: number;
  state: 'failed' | 'success';
  err_msg?: string;
};

export let decodePdf = (base64Content: string) => {
  let base64 = base64Content.replace(/\s/g, '');
  let content = Buffer.from(base64, 'base64');
  if (
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) ||
    base64.length % 4 === 1 ||
    content.toString('base64').replace(/=+$/, '') !== base64.replace(/=+$/, '')
  ) {
    throw createApiServiceError(
      'Provide valid base64-encoded PDF content without a data URL prefix.'
    );
  }
  if (!content.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
    throw createApiServiceError('The decoded document must be a PDF file.');
  }
  return { base64: content.toString('base64'), content };
};

let mapApiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'PrintAutopilot',
    reason: 'printautopilot_api_error',
    operation,
    extractStatus: (upstreamError, response) => {
      if (response?.status !== undefined) return response.status;
      let data =
        isApiErrorRecord(upstreamError) && isApiErrorRecord(upstreamError.data)
          ? upstreamError.data
          : undefined;
      let status = data?.upstreamStatus;
      return typeof status === 'number' || typeof status === 'string' ? status : undefined;
    }
  });

export class Client {
  private api;

  constructor(connectionToken: string) {
    if (!connectionToken.trim()) {
      throw createApiServiceError('Reconnect with a PrintAutopilot connection token.');
    }
    this.api = createAuthenticatedAxios({
      baseURL: 'https://printautopilot.com/api',
      authHeader: { value: `Bearer ${connectionToken}` },
      headers: { Accept: 'application/json' }
    });
  }

  async addDocumentToQueue(params: {
    printQueueToken: string;
    fileName: string;
    base64Content: string;
  }) {
    let { base64 } = decodePdf(params.base64Content);
    return requestAxiosData(
      'submit document',
      () =>
        this.api.post(
          '/document/create',
          { fileName: params.fileName, base64 },
          { headers: { Authorization: `Bearer ${params.printQueueToken}` } }
        ),
      mapApiError
    );
  }

  async getPrintJobs() {
    let response = await requestAxiosData(
      'list print jobs',
      () => this.api.get('/print-jobs'),
      mapApiError
    );
    if (Array.isArray(response)) return response;
    if (isApiErrorRecord(response) && Array.isArray(response.data)) return response.data;
    throw createApiServiceError('PrintAutopilot returned an unexpected print-job list.', {
      reason: 'printautopilot_invalid_response'
    });
  }

  async createPrinters(printers: PrinterInput[]) {
    return requestAxiosData(
      'create printers',
      () => this.api.post('/printers', printers),
      mapApiError
    );
  }

  async finishDocuments(documents: DocumentResultInput[]) {
    return requestAxiosData(
      'finish documents',
      () => this.api.post('/finish-print-jobs', documents),
      mapApiError
    );
  }
}
