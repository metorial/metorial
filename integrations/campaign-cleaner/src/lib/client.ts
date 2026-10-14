import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';

export interface SendCampaignParams {
  campaignHtml: string;
  campaignName: string;
  inlineCss?: boolean;
  inlineCssImportant?: boolean;
  preserveMediaQueries?: boolean;
  mediaQueriesImportant?: boolean;
  removeCssInheritance?: boolean;
  adjustFontColors?: boolean;
  adjustFontSize?: boolean;
  minFontSizeAllowed?: number;
  maxFontSizeAllowed?: number;
  replaceDiacritics?: boolean;
  replaceNonAsciiCharacters?: boolean;
  removeComments?: boolean;
  removeClassesAndIds?: boolean;
  removeControlNonPrintable?: boolean;
  removeSuccessivePunctuation?: boolean;
  convertHToPTags?: boolean;
  convertTablesToDivs?: boolean;
  resizeAndHost?: boolean;
  hostExtensionlessImages?: boolean;
  imageMaxWidth?: number;
  removeImageHeight?: boolean;
  removeLargeWidthsOver?: number;
  surroundingDiv?: {
    maxWidth?: number;
    textAlign?: string;
    fontSize?: number;
    centerToParent?: boolean;
  };
  relativeLinksBaseUrl?: string;
  webhookUrl?: string;
  customInfo?: string;
  minifyHtml?: boolean;
}

export interface CampaignStatus {
  id: string;
  campaignName: string;
  status: string;
  dateAdded: string;
}

export interface CampaignListItem {
  id: string;
  campaignName: string;
  status: string;
  dateAdded: string;
}

export interface SpamKeyword {
  keyword: string;
  count: number;
}

export interface LinkInfo {
  url: string;
  statusCode: number;
  redirectUrl: string;
  isImage: boolean;
  isBroken: boolean;
  protocol: string;
  status?: string;
  blacklistName?: string;
  blacklistUrl?: string;
}

export interface ImageInfo {
  url: string;
  sizeKb: number;
  width: number;
  height: number;
  renderedWidth: number;
  renderedHeight: number;
  imageType: string;
  isBackground?: boolean;
}

export interface CampaignSummaryItem {
  message: string;
  count: number;
  htmlModified: boolean;
}

export interface CampaignResult {
  campaignId: string;
  campaignName: string;
  customInfo: string;
  resultsTime: string;
  campaignHtml: string;
  totalWordCount: number;
  allCapitalizedWords: number;
  allCapitalizedWordRatio: number;
  spamWordsCount: number;
  spamKeywordRatio: number;
  spamKeywordList: SpamKeyword[];
  textImageRatio: number;
  textLinkRatio: number;
  linksScanned: number;
  brokenLinks: number;
  allLinkList: LinkInfo[];
  blacklistedLinksFound: number;
  blacklistedLinks: LinkInfo[];
  pdCdnsFound: number;
  pdCdnList: unknown[];
  domainsScanned: number;
  domainList?: string[];
  brokenLinkList?: LinkInfo[];
  imageCount: number;
  imageList: ImageInfo[];
  osImageList: ImageInfo[];
  bgImageList: ImageInfo[];
  campaignSummary: CampaignSummaryItem[];
}

// Maps camelCase params to snake_case API fields
let toSendCampaignBody = (params: SendCampaignParams): Record<string, unknown> => {
  let body: Record<string, unknown> = {
    campaign_html: params.campaignHtml,
    campaign_name: params.campaignName
  };

  if (params.inlineCss !== undefined) body.inline_css = params.inlineCss;
  if (params.inlineCssImportant !== undefined)
    body.inline_css_important = params.inlineCssImportant;
  if (params.preserveMediaQueries !== undefined)
    body.preserve_media_queries = params.preserveMediaQueries;
  if (params.mediaQueriesImportant !== undefined)
    body.media_queries_important = params.mediaQueriesImportant;
  if (params.removeCssInheritance !== undefined)
    body.remove_css_inheritance = params.removeCssInheritance;
  if (params.adjustFontColors !== undefined) body.adjust_font_colors = params.adjustFontColors;
  if (params.adjustFontSize !== undefined) body.adjust_font_size = params.adjustFontSize;
  if (params.minFontSizeAllowed !== undefined)
    body.min_font_size_allowed = params.minFontSizeAllowed;
  if (params.maxFontSizeAllowed !== undefined)
    body.max_font_size_allowed = params.maxFontSizeAllowed;
  if (params.replaceDiacritics !== undefined)
    body.replace_diacritics = params.replaceDiacritics;
  if (params.replaceNonAsciiCharacters !== undefined)
    body.replace_non_ascii_characters = params.replaceNonAsciiCharacters;
  if (params.removeComments !== undefined) body.remove_comments = params.removeComments;
  if (params.removeClassesAndIds !== undefined)
    body.remove_classes_and_ids = params.removeClassesAndIds;
  if (params.removeControlNonPrintable !== undefined)
    body.remove_control_non_printable = params.removeControlNonPrintable;
  if (params.removeSuccessivePunctuation !== undefined)
    body.remove_successive_punctuation = params.removeSuccessivePunctuation;
  if (params.convertHToPTags !== undefined) body.convert_h_to_p_tags = params.convertHToPTags;
  if (params.convertTablesToDivs !== undefined)
    body.convert_tables_to_divs = params.convertTablesToDivs;
  if (params.resizeAndHost !== undefined) body.resize_and_host = params.resizeAndHost;
  if (params.hostExtensionlessImages !== undefined)
    body.host_extensionless_images = params.hostExtensionlessImages;
  if (params.imageMaxWidth !== undefined) body.image_max_width = params.imageMaxWidth;
  if (params.removeImageHeight !== undefined)
    body.remove_image_height = params.removeImageHeight;
  if (params.removeLargeWidthsOver !== undefined)
    body.remove_large_widths_over = params.removeLargeWidthsOver;
  if (params.relativeLinksBaseUrl !== undefined)
    body.relative_links_base_url = params.relativeLinksBaseUrl;
  if (params.webhookUrl !== undefined) body.webhook_url = params.webhookUrl;
  if (params.customInfo !== undefined) body.custom_info = params.customInfo;
  if (params.minifyHtml !== undefined) body.minify_html = params.minifyHtml;

  if (params.surroundingDiv) {
    let div: Record<string, unknown> = {};
    if (params.surroundingDiv.maxWidth !== undefined)
      div.max_width = params.surroundingDiv.maxWidth;
    if (params.surroundingDiv.textAlign !== undefined)
      div.text_align = params.surroundingDiv.textAlign;
    if (params.surroundingDiv.fontSize !== undefined)
      div.font_size = params.surroundingDiv.fontSize;
    if (params.surroundingDiv.centerToParent !== undefined)
      div.center_to_parent = params.surroundingDiv.centerToParent;
    body.surrounding_div = div;
  }

  return body;
};

let numberValue = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return 0;
};

let stringValue = (value: unknown): string => (typeof value === 'string' ? value : '');
let booleanValue = (value: unknown): boolean => value === true;

let mapLink = (value: unknown): LinkInfo => {
  let link = isApiErrorRecord(value) ? value : {};
  let url = stringValue(link.link_url ?? link.url);
  let protocol = stringValue(link.protocol);
  if (!protocol && url) {
    try {
      protocol = new URL(url).protocol.replace(/:$/, '');
    } catch {
      // The provider also reports invalid URLs in link diagnostics.
    }
  }
  return {
    url,
    statusCode: numberValue(link.status_code ?? link.link_status),
    redirectUrl: stringValue(link.link_redirected_url ?? link.redirect_url),
    isImage: booleanValue(link.link_is_image ?? link.is_image),
    isBroken: booleanValue(link.link_is_broken ?? link.is_broken),
    protocol,
    ...(link.link_status !== undefined ? { status: String(link.link_status) } : {}),
    ...(typeof link.bl_name === 'string' ? { blacklistName: link.bl_name } : {}),
    ...(typeof link.bl_url === 'string' ? { blacklistUrl: link.bl_url } : {})
  };
};

let imageTypes: Record<number, string> = {
  1: 'png',
  2: 'jpeg',
  3: 'gif',
  4: 'bmp',
  5: 'svg',
  6: 'avif',
  7: 'tif',
  8: 'webp',
  9: 'apng',
  10: 'heic',
  11: 'icon',
  12: 'base64',
  '-1': 'unknown'
};

let mapImage = (value: unknown): ImageInfo => {
  let img = isApiErrorRecord(value) ? value : {};
  return {
    url: stringValue(img.image_url ?? img.url),
    sizeKb: numberValue(img.image_size ?? img.size_kb ?? img.size),
    width: numberValue(img.image_width ?? img.width),
    height: numberValue(img.image_height ?? img.height),
    renderedWidth: numberValue(img.image_rendered_width ?? img.rendered_width),
    renderedHeight: numberValue(img.image_rendered_height ?? img.rendered_height),
    imageType:
      typeof img.image_type === 'number'
        ? (imageTypes[img.image_type] ?? 'unknown')
        : stringValue(img.image_type),
    ...(typeof img.image_background === 'boolean'
      ? { isBackground: img.image_background }
      : {})
  };
};

let mapSummaryItem = (value: unknown): CampaignSummaryItem => {
  let item = isApiErrorRecord(value) ? value : {};
  return {
    message: stringValue(item.message),
    count: numberValue(item.count),
    htmlModified: booleanValue(item.html_changed ?? item.html_modified)
  };
};

let mapSpamKeyword = (value: unknown): SpamKeyword => {
  let kw = isApiErrorRecord(value) ? value : {};
  return { keyword: stringValue(kw.keyword), count: numberValue(kw.count) };
};

export let mapCampaignResult = (data: Record<string, unknown>): CampaignResult => ({
  campaignId: stringValue(data.campaign_id),
  campaignName: stringValue(data.campaign_name),
  customInfo: stringValue(data.custom_info),
  resultsTime: stringValue(data.results_time),
  campaignHtml: stringValue(data.campaign_html),
  totalWordCount: numberValue(data.total_word_count),
  allCapitalizedWords: numberValue(data.all_capitalized_words),
  allCapitalizedWordRatio: numberValue(data.all_capitalized_word_ratio),
  spamWordsCount: numberValue(data.spam_words_count),
  spamKeywordRatio: numberValue(data.spam_keyword_ratio),
  spamKeywordList: Array.isArray(data.spam_keyword_list)
    ? data.spam_keyword_list.map(mapSpamKeyword)
    : [],
  textImageRatio: numberValue(data.text_image_ratio),
  textLinkRatio: numberValue(data.text_link_ratio),
  linksScanned: numberValue(data.links_scanned),
  brokenLinks:
    typeof data.broken_links === 'number'
      ? data.broken_links
      : numberValue(
          data.broken_links_found ??
            (Array.isArray(data.broken_links) ? data.broken_links.length : 0)
        ),
  allLinkList: Array.isArray(data.all_link_list) ? data.all_link_list.map(mapLink) : [],
  blacklistedLinksFound: numberValue(data.blacklisted_links_found),
  blacklistedLinks: Array.isArray(data.blacklisted_links)
    ? data.blacklisted_links.map(mapLink)
    : [],
  pdCdnsFound: numberValue(data.pd_cdns_found),
  pdCdnList: Array.isArray(data.pd_cdn_list) ? data.pd_cdn_list : [],
  domainsScanned: Array.isArray(data.domains_scanned)
    ? data.domains_scanned.length
    : numberValue(data.domains_scanned),
  ...(Array.isArray(data.domains_scanned)
    ? {
        domainList: data.domains_scanned.filter(
          (domain): domain is string => typeof domain === 'string'
        )
      }
    : {}),
  ...(Array.isArray(data.broken_links)
    ? { brokenLinkList: data.broken_links.map(mapLink) }
    : {}),
  imageCount: numberValue(data.image_count),
  imageList: Array.isArray(data.image_list) ? data.image_list.map(mapImage) : [],
  osImageList: Array.isArray(data.os_image_list) ? data.os_image_list.map(mapImage) : [],
  bgImageList: Array.isArray(data.bg_image_list) ? data.bg_image_list.map(mapImage) : [],
  campaignSummary: Array.isArray(data.campaign_summary)
    ? data.campaign_summary.map(mapSummaryItem)
    : []
});

let mapCampaignStatus = (data: Record<string, unknown>): CampaignStatus => ({
  id: stringValue(data.id),
  campaignName: stringValue(data.campaign_name),
  status: stringValue(data.status),
  dateAdded: stringValue(data.date_added)
});

let decodeBinaryBody = (value: unknown): unknown => {
  if (!(value instanceof Uint8Array) && !(value instanceof ArrayBuffer)) return value;
  let text = Buffer.from(
    value instanceof ArrayBuffer ? new Uint8Array(value) : value
  ).toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

let apiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Campaign Cleaner',
    reason: 'campaign_cleaner_api_error',
    operation,
    nestedKeys: ['error', 'errors']
  });

let checkResponse = (data: unknown, operation: string): Record<string, unknown> => {
  if (!isApiErrorRecord(data)) {
    throw createApiServiceError(
      `Campaign Cleaner returned an invalid response for ${operation}.`
    );
  }
  if (data.error) {
    throw apiError({ response: { data, status: 200 } }, operation);
  }
  return data;
};

let requireId = (value: unknown, operation: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError(`Campaign Cleaner did not return an ID for ${operation}.`);
  }
  return value;
};

export interface InboxTest {
  jobId: string;
  testName: string;
  mailtesterAddress: string;
  instructions: string;
  sendTo: string[];
}

export interface InboxTestResults {
  jobId: string;
  testName: string;
  submittedDate: string;
  submittedBy: string;
  status: string;
  summary: {
    totalSeeds: number;
    received: number;
    inbox: number;
    spam: number;
    unknownPlacement: number;
    pending: number;
    inboxRate: number;
    spamRate: number;
  };
  results: {
    provider: string;
    seedAddress: string;
    emailFound: boolean;
    placement: string;
    spfStatus: string;
    senderIp: string;
    submissionResult: string;
  }[];
}

export class Client {
  private api;

  constructor(config: { token: string }) {
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.campaigncleaner.com/v1',
      authHeader: { name: 'X-CC-API-Key', value: config.token },
      errorMapping: { extractResponseData: response => decodeBinaryBody(response.data) }
    });
  }

  private async request(operation: string, path: string, body?: Record<string, unknown>) {
    let data = await requestAxiosData<unknown>(
      operation,
      () => (body === undefined ? this.api.get(path) : this.api.post(path, body)),
      apiError
    );
    return checkResponse(data, operation);
  }

  async sendCampaign(params: SendCampaignParams): Promise<{ campaignId: string }> {
    if (params.customInfo && params.customInfo.length > 500) {
      throw createApiServiceError('Custom info must be no more than 500 characters.');
    }
    for (let [field, value] of [
      ['minFontSizeAllowed', params.minFontSizeAllowed],
      ['maxFontSizeAllowed', params.maxFontSizeAllowed]
    ] as const) {
      if (value !== undefined && (!Number.isInteger(value) || value <= 0 || value >= 100)) {
        throw createApiServiceError(`${field} must be a positive whole number below 100.`);
      }
    }
    if ((params.minFontSizeAllowed ?? 10) > (params.maxFontSizeAllowed ?? 32)) {
      throw createApiServiceError('Minimum font size cannot exceed maximum font size.');
    }
    let data = await this.request('send campaign', '/send_campaign', {
      send_campaign: toSendCampaignBody(params)
    });
    let campaign = isApiErrorRecord(data.campaign) ? data.campaign : {};
    return { campaignId: requireId(campaign.id, 'send campaign') };
  }

  async getCampaign(campaignId: string, minifyHtml: boolean = true): Promise<CampaignResult> {
    let data = await this.request('get campaign', '/get_campaign', {
      campaign: { id: campaignId, minimize_html: minifyHtml }
    });
    let campaign = checkResponse(data.campaign ?? data, 'get campaign');
    requireId(campaign.campaign_id, 'get campaign');
    return mapCampaignResult(campaign);
  }

  async getCampaignStatus(campaignId: string): Promise<CampaignStatus> {
    let data = await this.request('get campaign status', '/get_campaign_status', {
      campaign: { id: campaignId }
    });
    let campaign = checkResponse(data.campaign_status ?? data, 'get campaign status');
    requireId(campaign.id, 'get campaign status');
    return mapCampaignStatus(campaign);
  }

  async getCampaignList(): Promise<CampaignListItem[]> {
    let data = await this.request('list campaigns', '/get_campaign_list');
    if (!Array.isArray(data.campaign_list)) {
      throw createApiServiceError('Campaign Cleaner did not return a campaign list.');
    }
    return data.campaign_list.map(item => {
      let campaign = checkResponse(item, 'list campaigns');
      requireId(campaign.id, 'list campaigns');
      return mapCampaignStatus(campaign);
    });
  }

  async deleteCampaign(campaignId: string): Promise<{ status: string }> {
    let data = await this.request('delete campaign', '/delete_campaign', {
      campaign: { id: campaignId }
    });
    if (data.status !== 'success') {
      throw createApiServiceError(
        'Campaign Cleaner could not delete this campaign. Check that the campaign ID exists and has not already been deleted.'
      );
    }
    return { status: data.status };
  }

  async getCredits(): Promise<{ credits: number }> {
    let data = await this.request('get credits', '/get_credits');
    if (typeof data.credits !== 'number' || !Number.isFinite(data.credits)) {
      throw createApiServiceError('Campaign Cleaner did not return a valid credit balance.');
    }
    return { credits: data.credits };
  }

  async getCampaignPdfAnalysis(campaignId: string): Promise<{ pdfBase64: string }> {
    let data = await requestAxiosData<unknown>(
      'get PDF report',
      () =>
        this.api.post(
          '/get_campaign_pdf_analysis',
          { campaign: { id: campaignId } },
          { responseType: 'arraybuffer' }
        ),
      apiError
    );
    if (!(data instanceof Uint8Array) && !(data instanceof ArrayBuffer)) {
      checkResponse(data, 'get PDF report');
      throw createApiServiceError('Campaign Cleaner did not return a PDF report.');
    }
    let buffer = Buffer.from(data instanceof ArrayBuffer ? new Uint8Array(data) : data);
    if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      let decoded = decodeBinaryBody(buffer);
      if (isApiErrorRecord(decoded)) checkResponse(decoded, 'get PDF report');
      throw createApiServiceError(
        'Campaign Cleaner did not return a PDF report. Check that the campaign has completed processing.'
      );
    }
    return { pdfBase64: buffer.toString('base64') };
  }

  async createInboxTest(testName: string): Promise<InboxTest> {
    let data = await this.request('create inbox test', '/create_inbox_test', {
      test_name: testName
    });
    let jobId = requireId(data.job_id, 'create inbox test');
    if (
      !Array.isArray(data.send_to) ||
      data.send_to.length === 0 ||
      data.send_to.some(address => typeof address !== 'string')
    ) {
      throw createApiServiceError(
        'Campaign Cleaner did not return valid seed email addresses for this inbox test.'
      );
    }
    return {
      jobId,
      testName: stringValue(data.test_name),
      mailtesterAddress: stringValue(data.mailtester_address),
      instructions: stringValue(data.instructions),
      sendTo: data.send_to as string[]
    };
  }

  async getInboxTestResults(jobId: string): Promise<InboxTestResults> {
    let data = await this.request('get inbox test results', '/get_inbox_test_results', {
      job_id: jobId
    });
    requireId(data.job_id, 'get inbox test results');
    let summary = checkResponse(data.summary, 'get inbox test results summary');
    if (!Array.isArray(data.results)) {
      throw createApiServiceError('Campaign Cleaner did not return inbox test results.');
    }
    return {
      jobId: stringValue(data.job_id),
      testName: stringValue(data.test_name),
      submittedDate: stringValue(data.submitted_date),
      submittedBy: stringValue(data.submitted_by),
      status: stringValue(data.status),
      summary: {
        totalSeeds: numberValue(summary.total_seeds),
        received: numberValue(summary.received),
        inbox: numberValue(summary.inbox),
        spam: numberValue(summary.spam),
        unknownPlacement: numberValue(summary.unknown_placement),
        pending: numberValue(summary.pending),
        inboxRate: numberValue(summary.inbox_rate),
        spamRate: numberValue(summary.spam_rate)
      },
      results: data.results.map(value => {
        let result = checkResponse(value, 'get inbox test seed result');
        return {
          provider: stringValue(result.provider),
          seedAddress: stringValue(result.seed_address),
          emailFound: booleanValue(result.email_found),
          placement: stringValue(result.placement),
          spfStatus: stringValue(result.spf_status),
          senderIp: stringValue(result.sender_ip),
          submissionResult: stringValue(result.submission_result)
        };
      })
    };
  }
}
