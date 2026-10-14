import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined,
  type SlateAxiosErrorOptions
} from 'slates';

let errorMapping: SlateAxiosErrorOptions = {
  mapAxiosError: (error, inferred) => {
    let body = error.response?.data;
    if (!isApiErrorRecord(body)) return undefined;
    let nested = isApiErrorRecord(body.error) ? body.error : undefined;
    let code = body.errorCode ?? nested?.code;
    let remediation = pickDefined({
      hint: typeof body.hint === 'string' ? body.hint : undefined,
      next_steps: Array.isArray(body.next_steps) ? body.next_steps : undefined,
      details: body.details
    });
    return {
      ...(typeof code === 'string' || typeof code === 'number'
        ? { upstream: { ...inferred.upstream, code: String(code) } }
        : {}),
      ...(Object.keys(remediation).length > 0
        ? { baggage: { autoboundRemediation: remediation } }
        : {})
    };
  }
};

let errorAdapter = (error: unknown) => {
  let data = isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : undefined;
  let baggage = isApiErrorRecord(data?.baggage) ? data.baggage : undefined;
  let remediation = isApiErrorRecord(baggage?.autoboundRemediation)
    ? baggage.autoboundRemediation
    : undefined;
  let serviceError = buildApiServiceError(error, {
    providerLabel: 'Autobound',
    reason: 'autobound_api_error',
    extractMessage: (value, helpers) => {
      let message = helpers.extractMessage(value);
      if (typeof remediation?.hint === 'string') message += ` ${remediation.hint}`;
      if (remediation?.next_steps !== undefined) {
        message += ` Next steps: ${JSON.stringify(remediation.next_steps)}`;
      }
      if (remediation?.details !== undefined) {
        message += ` Details: ${JSON.stringify(remediation.details)}`;
      }
      return message;
    },
    extractUpstreamCode: value => {
      if (!isApiErrorRecord(value) || !isApiErrorRecord(value.data)) return undefined;
      let upstream = value.data.upstream;
      return isApiErrorRecord(upstream) && typeof upstream.code === 'string'
        ? upstream.code
        : undefined;
    }
  });
  if (serviceError === error) return serviceError;
  if (remediation) Object.assign(serviceError.data, remediation);
  return serviceError;
};

let contentApi = createAuthenticatedAxios({
  baseURL: 'https://api.autobound.ai/api',
  errorMapping,
  errorAdapter
});

let signalsApi = createAuthenticatedAxios({
  baseURL: 'https://signals.autobound.ai/v1',
  errorMapping,
  errorAdapter
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
  userCompanyUrl?: string;
  userCompanyDomain?: string;
  userCompanyLinkedinUrl?: string;
  userName?: string;
  contentType: string;
  writingStyle?: string;
  customWritingStyle?: string;
  n?: number;
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
  contactEmail?: string | null;
  contactCompanyName?: string | null;
  contactJobTitle?: string | null;
  contentList: Array<{
    subject?: string | null;
    step?: number | null;
    characterCount?: number | null;
    salesAssetsUsed?: any[] | null;
    valuePropsUsed?: any[] | null;
    content: string;
    modelUsed: string;
    contentItemId: string;
    insightsUsed?: Array<{
      insightId: string;
      name: string;
      type: string;
      score: number;
    }> | null;
  }>;
  insightsUsed?: any[] | null;
  salesAssetsUsed?: any[] | null;
  valuePropsUsed?: any[] | null;
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
  signalSubtypes?: string[];
  detectedAfter?: string;
  limit?: number;
}

export interface EnrichContactParams extends Omit<EnrichCompanyParams, 'domain'> {
  contactEmail?: string;
  contactLinkedinUrl?: string;
}

export interface ListSignalTypesParams {
  includeCounts?: boolean;
  association?: 'company' | 'contact';
  since?: string;
}

let validateEnrichment = (params: Omit<EnrichCompanyParams, 'domain'>) => {
  if (
    params.limit !== undefined &&
    (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 500)
  ) {
    throw createApiServiceError('limit must be a whole number between 1 and 500.');
  }
  if (
    params.signalSubtypes &&
    (params.signalSubtypes.length > 25 ||
      params.signalSubtypes.some(value => value.length > 200))
  ) {
    throw createApiServiceError(
      'Provide at most 25 signal subtypes, each up to 200 characters.'
    );
  }
};

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
  private contentAxios: ReturnType<typeof createAuthenticatedAxios>;
  private signalsAxios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(
    private token: string,
    private signalToken: string = token
  ) {
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
      'X-API-KEY': this.signalToken,
      'Content-Type': 'application/json'
    };
  }

  async generateContent(params: GenerateContentParams): Promise<GenerateContentResponse> {
    if (!params.contactEmail?.trim() && !params.contactLinkedinUrl?.trim()) {
      throw createApiServiceError(
        'Provide contactEmail or contactLinkedinUrl to generate content. contactCompanyUrl only overrides the company.'
      );
    }
    if (!params.userEmail?.trim() && !params.userLinkedinUrl?.trim()) {
      throw createApiServiceError(
        'Provide userEmail or userLinkedinUrl to identify the seller.'
      );
    }
    if (params.contentType === 'custom' && !params.customContentType?.trim()) {
      throw createApiServiceError('Provide customContentType when contentType is custom.');
    }
    if (params.writingStyle === 'custom' && !params.customWritingStyle?.trim()) {
      throw createApiServiceError('Provide customWritingStyle when writingStyle is custom.');
    }
    if (
      params.n !== undefined &&
      (!Number.isInteger(params.n) ||
        params.n < 1 ||
        params.n > 3 ||
        params.contentType === 'sequence')
    ) {
      throw createApiServiceError(
        'n must be a whole number from 1 to 3 and cannot be used for sequences.'
      );
    }
    if (
      params.sequenceNumberOfEmails !== undefined &&
      (params.contentType !== 'sequence' ||
        !Number.isInteger(params.sequenceNumberOfEmails) ||
        params.sequenceNumberOfEmails < 1)
    ) {
      throw createApiServiceError(
        'sequenceNumberOfEmails must be a positive whole number and can only be used for sequences.'
      );
    }
    if (
      params.wordCount !== undefined &&
      (!Number.isInteger(params.wordCount) || params.wordCount < 1)
    ) {
      throw createApiServiceError('wordCount must be a positive whole number.');
    }
    let response = await this.contentAxios.post(
      '/external/generate-content/v3.6',
      {
        ...params,
        contactCompanyUrl: params.contactCompanyUrl ?? params.contactCompanyDomain,
        userCompanyUrl: params.userCompanyUrl ?? params.userCompanyDomain,
        model: params.model === 'sonnet' ? 'sonnet_3.5' : params.model
      },
      {
        headers: this.contentHeaders()
      }
    );
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
      `/workflows/campaigns/${encodeURIComponent(campaignId)}/execute/`,
      body,
      { headers: this.contentHeaders() }
    );
    return response.data;
  }

  async enrichCompany(params: EnrichCompanyParams): Promise<any> {
    if (!params.domain.trim()) throw createApiServiceError('Provide a company domain.');
    validateEnrichment(params);
    let response = await this.signalsAxios.post(
      '/companies/enrich',
      {
        domain: params.domain,
        signal_types: params.signalTypes,
        signal_subtypes: params.signalSubtypes,
        detected_after: params.detectedAfter,
        limit: params.limit
      },
      {
        headers: this.signalHeaders()
      }
    );
    return response.data;
  }

  async enrichContact(params: EnrichContactParams): Promise<Record<string, any>> {
    if (!params.contactEmail?.trim() && !params.contactLinkedinUrl?.trim()) {
      throw createApiServiceError(
        'Provide contactEmail or contactLinkedinUrl to enrich a contact.'
      );
    }
    validateEnrichment(params);
    let response = await this.signalsAxios.post(
      '/contacts/enrich',
      {
        contact_email: params.contactEmail,
        contact_linkedin_url: params.contactLinkedinUrl,
        signal_types: params.signalTypes,
        signal_subtypes: params.signalSubtypes,
        detected_after: params.detectedAfter,
        limit: params.limit
      },
      { headers: this.signalHeaders() }
    );
    return response.data;
  }

  async getAccount(): Promise<Record<string, any>> {
    let response = await this.signalsAxios.get('/account', { headers: this.signalHeaders() });
    return response.data;
  }

  async listSignalTypes(params: ListSignalTypesParams): Promise<Record<string, any>> {
    let response = await this.signalsAxios.get('/signals/types', {
      headers: this.signalHeaders(),
      params: {
        include_counts:
          params.includeCounts === undefined ? undefined : String(params.includeCounts),
        association: params.association,
        since: params.since
      }
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
