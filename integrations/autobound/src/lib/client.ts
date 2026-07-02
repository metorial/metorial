import { createAxios } from 'slates';

let contentApi = createAxios({
  baseURL: 'https://api.autobound.ai/api'
});

let signalsApi = createAxios({
  baseURL: 'https://signals.autobound.ai/v1'
});

export interface GenerateContentParams {
  contactEmail?: string;
  contactLinkedinUrl?: string;
  contactCompanyUrl?: string;
  contactName?: string;
  contactCompanyName?: string;
  contactCompanyDomain?: string;
  contactCompanyLinkedinUrl?: string;
  userEmail?: string;
  userLinkedinUrl?: string;
  userCompanyName?: string;
  userCompanyDomain?: string;
  userCompanyLinkedinUrl?: string;
  userName?: string;
  contentType: string;
  writingStyle?: string;
  wordCount?: number;
  language?: string;
  additionalContext?: string;
  salesAsset?: string;
  enabledInsights?: string[];
  disabledInsights?: string[];
  model?: string;
  contentToRewrite?: string;
  customContentType?: string;
  sequenceNumberOfEmails?: number;
  valueProposition?: string;
}

export interface GenerateContentResponse {
  type: string;
  contactEmail: string;
  contactCompanyName: string;
  contactJobTitle: string;
  contentList: Array<{
    subject?: string;
    content: string;
    modelUsed: string;
    contentItemId: string;
    insightsUsed: Array<{
      insightId: string;
      name: string;
      type: string;
      score: number;
    }>;
  }>;
  salesAssetsUsed: any[];
  valuePropsUsed: any[];
}

export interface GenerateInsightsParams {
  contactEmail?: string;
  contactLinkedinUrl?: string;
  contactCompanyUrl?: string;
  userEmail?: string;
  userLinkedinUrl?: string;
  userCompanyUrl?: string;
  insightSubtype?: string | string[];
}

export interface InsightItem {
  insightId: string;
  name: string;
  type: string;
  subType: string;
  variables: Record<string, any>;
}

export interface GenerateInsightsResponse {
  success: boolean;
  details: {
    prospect: {
      contactResolved: boolean;
      contactCompanyResolved: boolean;
      contactCompanyUrl?: string;
      contactLinkedinUrl?: string;
      contactEmail?: string;
    };
    user: {
      userResolved: boolean;
      userCompanyResolved: boolean;
      userCompanyUrl?: string;
      userLinkedinUrl?: string;
      userEmail?: string;
    };
  };
  insights: InsightItem[];
}

export interface CampaignExecuteParams {
  campaignId: string;
  contactEmail: string;
  contactName?: string;
  contactCompanySize?: number;
  contactCompanyName?: string;
  contactJobTitle?: string;
  [key: string]: any;
}

export interface EnrichCompanyParams {
  domain: string;
  signalTypes?: string[];
  limit?: number;
}

export interface WebhookSubscription {
  subscriptionId: string;
  endpointUrl: string;
  signalTypes?: string[];
  signingSecret: string;
  status: string;
  createdAt: string;
}

export interface CreateWebhookParams {
  endpointUrl: string;
  signalTypes?: string[];
}

export interface CreateWebhookResponse {
  subscriptionId: string;
  signingSecret: string;
  endpointUrl: string;
  signalTypes?: string[];
  status: string;
}

export class AutoboundClient {
  private contentAxios: ReturnType<typeof createAxios>;
  private signalsAxios: ReturnType<typeof createAxios>;

  constructor(private token: string) {
    this.contentAxios = contentApi;
    this.signalsAxios = signalsApi;
  }

  private contentHeaders() {
    return {
      'X-API-KEY': this.token,
      'Content-Type': 'application/json'
    };
  }

  private signalHeaders() {
    return {
      'X-API-KEY': this.token,
      'Content-Type': 'application/json'
    };
  }

  async generateContent(params: GenerateContentParams): Promise<GenerateContentResponse> {
    let response = await this.contentAxios.post('/external/generate-content/v3.6', params, {
      headers: this.contentHeaders()
    });
    return response.data;
  }

  async generateInsights(params: GenerateInsightsParams): Promise<GenerateInsightsResponse> {
    let response = await this.contentAxios.post('/external/generate-insights/v1.4', params, {
      headers: this.contentHeaders()
    });
    return response.data;
  }

  async importCampaignContact(params: CampaignExecuteParams): Promise<any> {
    let { campaignId, ...body } = params;
    let response = await this.contentAxios.post(
      `/workflows/campaigns/${campaignId}/execute/`,
      body,
      { headers: this.contentHeaders() }
    );
    return response.data;
  }

  async enrichCompany(params: EnrichCompanyParams): Promise<any> {
    let response = await this.signalsAxios.post('/companies/enrich', params, {
      headers: this.signalHeaders()
    });
    return response.data;
  }

  async createWebhookSubscription(
    params: CreateWebhookParams
  ): Promise<CreateWebhookResponse> {
    let response = await this.signalsAxios.post('/webhooks/subscriptions', params, {
      headers: this.signalHeaders()
    });
    return response.data;
  }

  async listWebhookSubscriptions(): Promise<WebhookSubscription[]> {
    let response = await this.signalsAxios.get('/webhooks/subscriptions', {
      headers: this.signalHeaders()
    });
    return response.data;
  }

  async deleteWebhookSubscription(subscriptionId: string): Promise<void> {
    await this.signalsAxios.delete(`/webhooks/subscriptions/${subscriptionId}`, {
      headers: this.signalHeaders()
    });
  }

  async updateWebhookSubscription(
    subscriptionId: string,
    params: {
      endpointUrl?: string;
      signalTypes?: string[];
      status?: string;
    }
  ): Promise<any> {
    let response = await this.signalsAxios.patch(
      `/webhooks/subscriptions/${subscriptionId}`,
      params,
      { headers: this.signalHeaders() }
    );
    return response.data;
  }

  async rotateWebhookSigningSecret(
    subscriptionId: string
  ): Promise<{ signingSecret: string }> {
    let response = await this.signalsAxios.post(
      `/webhooks/subscriptions/${subscriptionId}/rotate-secret`,
      {},
      { headers: this.signalHeaders() }
    );
    return response.data;
  }

  async replayWebhookDelivery(deliveryId: string): Promise<any> {
    let response = await this.signalsAxios.post(
      `/webhooks/deliveries/${deliveryId}/replay`,
      {},
      { headers: this.signalHeaders() }
    );
    return response.data;
  }

  async backfillWebhookSignals(subscriptionId: string, fromDate: string): Promise<any> {
    let response = await this.signalsAxios.post(
      `/webhooks/subscriptions/${subscriptionId}/backfill`,
      { fromDate },
      { headers: this.signalHeaders() }
    );
    return response.data;
  }
}
