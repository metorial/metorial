import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  'us-central': 'https://llmwhisperer-api.us-central.unstract.com/api/v2',
  'eu-west': 'https://llmwhisperer-api.eu-west.unstract.com/api/v2'
};

export type ExtractionMode = 'native_text' | 'low_cost' | 'high_quality' | 'form' | 'table';
export type OutputMode = 'layout_preserving' | 'text';

export interface WhisperOptions {
  mode?: ExtractionMode;
  outputMode?: OutputMode;
  pageSeparator?: string;
  pagesToExtract?: string;
  medianFilterSize?: number;
  gaussianBlurRadius?: number;
  lineSplitterTolerance?: number;
  lineSplitterStrategy?: string;
  horizontalStretchFactor?: number;
  markVerticalLines?: boolean;
  markHorizontalLines?: boolean;
  tag?: string;
  fileName?: string;
  useWebhook?: string;
  webhookMetadata?: string;
  addLineNos?: boolean;
}

export interface WhisperResponse {
  message: string;
  status: string;
  whisperHash: string;
}

export interface WhisperStatusResponse {
  status: string;
  message: string;
  detail: Array<{
    executionTimeInSeconds: number;
    message: string;
    pageNo: number;
  }>;
}

export interface WhisperRetrieveResponse {
  resultText: string;
  confidenceMetadata: unknown;
  metadata: unknown;
  webhookMetadata: string;
}

export interface WhisperDetailResponse {
  whisperHash: string;
  mode: string;
  tag: string;
  completedAt: string | null;
  processingStartedAt: string | null;
  processingTimeInSeconds: number | null;
  processedPages: number | null;
  requestedPages: number | null;
  totalPages: number | null;
  uploadFileSizeInKb: number | null;
}

export interface TagUsageResponse {
  tag: string;
  startDate: string | null;
  endDate: string | null;
  subscriptionId: string | number | null;
  usage: Array<{ pagesProcessed: number; serviceType: string }>;
}

export interface HighlightEntry {
  baseY: number;
  baseYPercent: number;
  height: number;
  heightPercent: number;
  page: number;
  pageHeight: number;
  raw: number[];
}

export interface UsageInfo {
  subscriptionPlan: string;
  monthlyQuota: number;
  currentPageCount: any;
  overagePageCount: number;
  todayPageCount: number;
  dailyQuota: number;
}

export interface WebhookConfig {
  url: string;
  authToken: string;
  webhookName: string;
}

export class Client {
  private token: string;
  private baseUrl: string;

  constructor(config: { token: string; region: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'An LLMWhisperer API key is required. Reconnect with a valid key.'
      );
    }
    this.token = config.token;
    this.baseUrl = BASE_URLS[config.region] ?? BASE_URLS['us-central']!;
  }

  private getAxios() {
    return createAuthenticatedAxios({
      baseURL: this.baseUrl,
      timeout: 120_000,
      authHeader: { name: 'unstract-key', value: this.token },
      contentType: false,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'LLMWhisperer',
          reason: 'llmwhisperer_api_error'
        })
    });
  }

  async whisperFromUrl(url: string, options: WhisperOptions = {}): Promise<WhisperResponse> {
    let ax = this.getAxios();
    let params = this.buildWhisperParams(options);
    params.url_in_post = 'true';

    let response = await ax.post('/whisper', url, {
      params,
      headers: {
        'Content-Type': 'text/plain'
      }
    });

    return {
      message: response.data.message,
      status: response.data.status,
      whisperHash: response.data.whisper_hash
    };
  }

  async whisperFromFile(
    fileBuffer: Buffer,
    options: WhisperOptions = {}
  ): Promise<WhisperResponse> {
    let ax = this.getAxios();
    let params = this.buildWhisperParams(options);

    let response = await ax.post('/whisper', fileBuffer, {
      params,
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });

    return {
      message: response.data.message,
      status: response.data.status,
      whisperHash: response.data.whisper_hash
    };
  }

  async getWhisperStatus(whisperHash: string): Promise<WhisperStatusResponse> {
    let ax = this.getAxios();
    let response = await ax.get('/whisper-status', {
      params: { whisper_hash: whisperHash }
    });

    let detail = (response.data.detail || []).map((d: any) => ({
      executionTimeInSeconds: d.execution_time_in_seconds,
      message: d.message,
      pageNo: d.page_no
    }));

    return {
      status: response.data.status,
      message: response.data.message,
      detail
    };
  }

  async retrieveWhisper(
    whisperHash: string,
    textOnly?: boolean
  ): Promise<WhisperRetrieveResponse> {
    let ax = this.getAxios();
    let params: Record<string, any> = { whisper_hash: whisperHash };
    if (textOnly) {
      params.text_only = 'true';
    }

    let response = await ax.get('/whisper-retrieve', { params });

    if (textOnly) {
      return {
        resultText:
          typeof response.data === 'string' ? response.data : response.data.result_text,
        confidenceMetadata: null,
        metadata: null,
        webhookMetadata: ''
      };
    }

    return {
      resultText: response.data.result_text,
      confidenceMetadata: response.data.confidence_metadata ?? null,
      metadata: response.data.metadata ?? null,
      webhookMetadata: response.data.webhook_metadata ?? ''
    };
  }

  async getWhisperDetails(whisperHash: string): Promise<WhisperDetailResponse> {
    let response = await this.getAxios().get('/whisper-detail', {
      params: { whisper_hash: whisperHash }
    });

    return {
      whisperHash: response.data.whisper_hash,
      mode: response.data.mode,
      tag: response.data.tag ?? '',
      completedAt: response.data.completed_at ?? null,
      processingStartedAt: response.data.processing_started_at ?? null,
      processingTimeInSeconds: response.data.processing_time_in_seconds ?? null,
      processedPages: response.data.processed_pages ?? null,
      requestedPages: response.data.requested_pages ?? null,
      totalPages: response.data.total_pages ?? null,
      uploadFileSizeInKb: response.data.upload_file_size_in_kb ?? null
    };
  }

  async getTagUsage(
    tag: string,
    fromDate?: string,
    toDate?: string
  ): Promise<TagUsageResponse> {
    let response = await this.getAxios().get('/usage', {
      params: { tag, from_date: fromDate, to_date: toDate }
    });

    return {
      tag: response.data.tag,
      startDate: response.data.start_date ?? null,
      endDate: response.data.end_date ?? null,
      subscriptionId: response.data.subscription_id ?? null,
      usage: (response.data.usage ?? []).map(
        (entry: { pages_processed: number; service_type: string }) => ({
          pagesProcessed: entry.pages_processed,
          serviceType: entry.service_type
        })
      )
    };
  }

  async getHighlights(
    whisperHash: string,
    lines: string
  ): Promise<Record<string, HighlightEntry>> {
    let ax = this.getAxios();
    let response = await ax.get('/highlights', {
      params: {
        whisper_hash: whisperHash,
        lines
      }
    });

    let result: Record<string, HighlightEntry> = {};
    for (let [key, value] of Object.entries(response.data as Record<string, any>)) {
      result[key] = {
        baseY: value.base_y,
        baseYPercent: value.base_y_percent,
        height: value.height,
        heightPercent: value.height_percent,
        page: value.page,
        pageHeight: value.page_height,
        raw: value.raw
      };
    }
    return result;
  }

  async getUsageInfo(): Promise<UsageInfo> {
    let ax = this.getAxios();
    let response = await ax.get('/get-usage-info');

    return {
      subscriptionPlan: response.data.subscription_plan,
      monthlyQuota: response.data.monthly_quota,
      currentPageCount: response.data.current_page_count,
      overagePageCount: response.data.overage_page_count,
      todayPageCount: response.data.today_page_count,
      dailyQuota: response.data.daily_quota
    };
  }

  async registerWebhook(webhookConfig: WebhookConfig): Promise<{ message: string }> {
    let ax = this.getAxios();
    let response = await ax.post(
      '/whisper-manage-callback',
      {
        url: webhookConfig.url,
        auth_token: webhookConfig.authToken,
        webhook_name: webhookConfig.webhookName
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    return { message: response.data.message };
  }

  async getWebhookDetails(webhookName: string): Promise<WebhookConfig> {
    let ax = this.getAxios();
    let response = await ax.get('/whisper-manage-callback', {
      params: { webhook_name: webhookName }
    });

    return {
      url: response.data.url,
      authToken: response.data.auth_token,
      webhookName: response.data.webhook_name
    };
  }

  async updateWebhook(webhookConfig: WebhookConfig): Promise<{ message: string }> {
    let ax = this.getAxios();
    let response = await ax.put(
      '/whisper-manage-callback',
      {
        url: webhookConfig.url,
        auth_token: webhookConfig.authToken,
        webhook_name: webhookConfig.webhookName
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    return { message: response.data.message };
  }

  async deleteWebhook(webhookName: string): Promise<{ message: string }> {
    let ax = this.getAxios();
    let response = await ax.delete('/whisper-manage-callback', {
      params: { webhook_name: webhookName }
    });

    return { message: response.data.message };
  }

  private buildWhisperParams(options: WhisperOptions): Record<string, any> {
    let params: Record<string, any> = {};

    if (options.mode) params.mode = options.mode;
    if (options.outputMode) params.output_mode = options.outputMode;
    if (options.pageSeparator !== undefined) params.page_separator = options.pageSeparator;
    if (options.pagesToExtract) params.pages_to_extract = options.pagesToExtract;
    if (options.medianFilterSize !== undefined)
      params.median_filter_size = options.medianFilterSize;
    if (options.gaussianBlurRadius !== undefined)
      params.gaussian_blur_radius = options.gaussianBlurRadius;
    if (options.lineSplitterTolerance !== undefined)
      params.line_splitter_tolerance = options.lineSplitterTolerance;
    if (options.lineSplitterStrategy)
      params.line_splitter_strategy = options.lineSplitterStrategy;
    if (options.horizontalStretchFactor !== undefined)
      params.horizontal_stretch_factor = options.horizontalStretchFactor;
    if (options.markVerticalLines !== undefined)
      params.mark_vertical_lines = options.markVerticalLines;
    if (options.markHorizontalLines !== undefined)
      params.mark_horizontal_lines = options.markHorizontalLines;
    if (options.tag) params.tag = options.tag;
    if (options.fileName) params.file_name = options.fileName;
    if (options.useWebhook) params.use_webhook = options.useWebhook;
    if (options.webhookMetadata) params.webhook_metadata = options.webhookMetadata;
    if (options.addLineNos !== undefined) params.add_line_nos = options.addLineNos;

    return params;
  }
}
