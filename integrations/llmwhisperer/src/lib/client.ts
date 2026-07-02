import { createAxios } from 'slates';

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
  confidenceMetadata: any;
  metadata: any;
  webhookMetadata: string;
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
    this.token = config.token;
    this.baseUrl = BASE_URLS[config.region] ?? BASE_URLS['us-central']!;
  }

  private getAxios() {
    return createAxios({
      baseURL: this.baseUrl,
      headers: {
        'unstract-key': this.token
      }
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
      confidenceMetadata: response.data.confidence_metadata,
      metadata: response.data.metadata,
      webhookMetadata: response.data.webhook_metadata
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
    if (options.pageSeparator !== undefined) params.page_seperator = options.pageSeparator;
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
