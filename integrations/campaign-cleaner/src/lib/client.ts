import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.campaigncleaner.com/v1'
});

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
}

export interface ImageInfo {
  url: string;
  sizeKb: number;
  width: number;
  height: number;
  renderedWidth: number;
  renderedHeight: number;
  imageType: string;
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
  pdCdnList: any[];
  domainsScanned: number;
  imageCount: number;
  imageList: ImageInfo[];
  osImageList: ImageInfo[];
  bgImageList: ImageInfo[];
  campaignSummary: CampaignSummaryItem[];
}

// Maps camelCase params to snake_case API fields
let toSendCampaignBody = (params: SendCampaignParams): Record<string, any> => {
  let body: Record<string, any> = {
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
    let div: Record<string, any> = {};
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

let mapLink = (link: any): LinkInfo => ({
  url: link.url ?? '',
  statusCode: link.status_code ?? 0,
  redirectUrl: link.redirect_url ?? '',
  isImage: link.is_image ?? false,
  isBroken: link.is_broken ?? false,
  protocol: link.protocol ?? ''
});

let mapImage = (img: any): ImageInfo => ({
  url: img.url ?? '',
  sizeKb: img.size_kb ?? img.size ?? 0,
  width: img.width ?? 0,
  height: img.height ?? 0,
  renderedWidth: img.rendered_width ?? 0,
  renderedHeight: img.rendered_height ?? 0,
  imageType: img.image_type ?? ''
});

let mapSummaryItem = (item: any): CampaignSummaryItem => ({
  message: item.message ?? '',
  count: item.count ?? 0,
  htmlModified: item.html_modified ?? false
});

let mapSpamKeyword = (kw: any): SpamKeyword => ({
  keyword: kw.keyword ?? '',
  count: kw.count ?? 0
});

export let mapCampaignResult = (data: any): CampaignResult => ({
  campaignId: data.campaign_id ?? '',
  campaignName: data.campaign_name ?? '',
  customInfo: data.custom_info ?? '',
  resultsTime: data.results_time ?? '',
  campaignHtml: data.campaign_html ?? '',
  totalWordCount: data.total_word_count ?? 0,
  allCapitalizedWords: data.all_capitalized_words ?? 0,
  allCapitalizedWordRatio: data.all_capitalized_word_ratio ?? 0,
  spamWordsCount: data.spam_words_count ?? 0,
  spamKeywordRatio: data.spam_keyword_ratio ?? 0,
  spamKeywordList: Array.isArray(data.spam_keyword_list)
    ? data.spam_keyword_list.map(mapSpamKeyword)
    : [],
  textImageRatio: data.text_image_ratio ?? 0,
  textLinkRatio: data.text_link_ratio ?? 0,
  linksScanned: data.links_scanned ?? 0,
  brokenLinks: data.broken_links ?? 0,
  allLinkList: Array.isArray(data.all_link_list) ? data.all_link_list.map(mapLink) : [],
  blacklistedLinksFound: data.blacklisted_links_found ?? 0,
  blacklistedLinks: Array.isArray(data.blacklisted_links)
    ? data.blacklisted_links.map(mapLink)
    : [],
  pdCdnsFound: data.pd_cdns_found ?? 0,
  pdCdnList: Array.isArray(data.pd_cdn_list) ? data.pd_cdn_list : [],
  domainsScanned: data.domains_scanned ?? 0,
  imageCount: data.image_count ?? 0,
  imageList: Array.isArray(data.image_list) ? data.image_list.map(mapImage) : [],
  osImageList: Array.isArray(data.os_image_list) ? data.os_image_list.map(mapImage) : [],
  bgImageList: Array.isArray(data.bg_image_list) ? data.bg_image_list.map(mapImage) : [],
  campaignSummary: Array.isArray(data.campaign_summary)
    ? data.campaign_summary.map(mapSummaryItem)
    : []
});

let mapCampaignStatus = (data: any): CampaignStatus => ({
  id: data.id ?? '',
  campaignName: data.campaign_name ?? '',
  status: data.status ?? '',
  dateAdded: data.date_added ?? ''
});

let mapCampaignListItem = (data: any): CampaignListItem => ({
  id: data.id ?? '',
  campaignName: data.campaign_name ?? '',
  status: data.status ?? '',
  dateAdded: data.date_added ?? ''
});

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      'X-CC-API-Key': config.token,
      'Content-Type': 'application/json'
    };
  }

  async sendCampaign(params: SendCampaignParams): Promise<{ campaignId: string }> {
    let response = await api.post(
      '/send_campaign',
      {
        send_campaign: toSendCampaignBody(params)
      },
      { headers: this.headers }
    );

    return {
      campaignId: response.data.campaign?.id ?? ''
    };
  }

  async getCampaign(campaignId: string, minifyHtml: boolean = true): Promise<CampaignResult> {
    let response = await api.post(
      '/get_campaign',
      {
        campaign: {
          id: campaignId,
          minimize_html: minifyHtml
        }
      },
      { headers: this.headers }
    );

    return mapCampaignResult(response.data.campaign ?? response.data);
  }

  async getCampaignStatus(campaignId: string): Promise<CampaignStatus> {
    let response = await api.post(
      '/get_campaign_status',
      {
        campaign: {
          id: campaignId
        }
      },
      { headers: this.headers }
    );

    return mapCampaignStatus(response.data.campaign_status ?? response.data);
  }

  async getCampaignList(): Promise<CampaignListItem[]> {
    let response = await api.get('/get_campaign_list', {
      headers: this.headers
    });

    let list = response.data.campaign_list ?? [];
    return Array.isArray(list) ? list.map(mapCampaignListItem) : [];
  }

  async deleteCampaign(campaignId: string): Promise<{ status: string }> {
    let response = await api.post(
      '/delete_campaign',
      {
        campaign: {
          id: campaignId
        }
      },
      { headers: this.headers }
    );

    return {
      status: response.data.status ?? 'unknown'
    };
  }

  async getCredits(): Promise<{ credits: number }> {
    let response = await api.get('/get_credits', {
      headers: this.headers
    });

    return {
      credits: response.data.credits ?? 0
    };
  }

  async getCampaignPdfAnalysis(campaignId: string): Promise<{ pdfBase64: string }> {
    let response = await api.post(
      '/get_campaign_pdf_analysis',
      {
        campaign: {
          id: campaignId
        }
      },
      {
        headers: this.headers,
        responseType: 'arraybuffer'
      }
    );

    let buffer = Buffer.from(response.data);
    return {
      pdfBase64: buffer.toString('base64')
    };
  }
}
