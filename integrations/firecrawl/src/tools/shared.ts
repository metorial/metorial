import { Buffer } from 'node:buffer';
import { z } from 'zod';
import { firecrawlServiceError } from '../lib/errors';

export let firecrawlFormatEnum = z.enum([
  'markdown',
  'summary',
  'html',
  'rawHtml',
  'links',
  'images',
  'screenshot',
  'json',
  'changeTracking',
  'branding',
  'audio',
  'video',
  'question',
  'highlights'
]);

export let actionSchema = z
  .object({
    type: z
      .enum([
        'wait',
        'click',
        'write',
        'press',
        'scroll',
        'screenshot',
        'executeJavascript',
        'pdf',
        'scrape'
      ])
      .describe('Browser action type to perform before extracting content'),
    selector: z.string().optional().describe('CSS selector for element-based actions'),
    milliseconds: z.number().optional().describe('Duration in milliseconds for wait actions'),
    text: z.string().optional().describe('Text for write/press actions'),
    direction: z.enum(['up', 'down']).optional().describe('Scroll direction'),
    amount: z.number().optional().describe('Scroll amount in pixels'),
    script: z.string().optional().describe('JavaScript code for executeJavascript actions'),
    fullPage: z.boolean().optional().describe('Capture a full-page screenshot')
  })
  .describe('A browser action to perform before extraction');

export let commonScrapeInputShape = {
  formats: z
    .array(firecrawlFormatEnum)
    .optional()
    .describe(
      'Output formats to request. Use companion fields for json, question, highlights, screenshot, and changeTracking formats.'
    ),
  onlyMainContent: z
    .boolean()
    .optional()
    .describe(
      'Extract only main content, excluding navigation, footers, and similar boilerplate'
    ),
  onlyCleanContent: z
    .boolean()
    .optional()
    .describe('Run Firecrawl clean-content processing over generated markdown'),
  includeTags: z
    .array(z.string())
    .optional()
    .describe('Only include content from CSS selectors'),
  excludeTags: z
    .array(z.string())
    .optional()
    .describe('Exclude content matching CSS selectors'),
  maxAge: z
    .number()
    .optional()
    .describe('Use cached content younger than this age in milliseconds'),
  minAge: z
    .number()
    .optional()
    .describe(
      'Only use cache and require cached content to be at least this old in milliseconds'
    ),
  headers: z
    .record(z.string(), z.string())
    .optional()
    .describe('HTTP headers Firecrawl should send when fetching the target page'),
  waitFor: z.number().optional().describe('Additional page wait time in milliseconds'),
  mobile: z.boolean().optional().describe('Emulate a mobile device'),
  skipTlsVerification: z.boolean().optional().describe('Skip TLS certificate verification'),
  timeout: z.number().optional().describe('Request timeout in milliseconds'),
  actions: z.array(actionSchema).optional().describe('Browser actions before extraction'),
  locationCountry: z
    .string()
    .optional()
    .describe('Country code for scraping location, e.g. US'),
  locationLanguages: z
    .array(z.string())
    .optional()
    .describe('Browser language tags for scraping location, e.g. en-US'),
  removeBase64Images: z
    .boolean()
    .optional()
    .describe('Remove base64 images from output and keep placeholders'),
  blockAds: z.boolean().optional().describe('Enable ad and cookie popup blocking'),
  proxy: z
    .enum(['basic', 'enhanced', 'auto'])
    .optional()
    .describe('Proxy mode: basic, enhanced, or auto'),
  storeInCache: z.boolean().optional().describe('Store this result in Firecrawl cache'),
  lockdown: z.boolean().optional().describe('Use lockdown mode and avoid outbound fetches'),
  zeroDataRetention: z
    .boolean()
    .optional()
    .describe('Enable zero-data-retention mode if available for the team'),
  profileName: z
    .string()
    .optional()
    .describe('Persistent browser profile name for scrape/interact state'),
  profileSaveChanges: z
    .boolean()
    .optional()
    .describe('Whether profile state should be saved when the session ends'),
  disablePdfParsing: z
    .boolean()
    .optional()
    .describe('Pass an empty parser list so PDFs are returned without page parsing'),
  pdfParserMode: z
    .enum(['fast', 'auto', 'ocr'])
    .optional()
    .describe('PDF parser mode when PDF parsing is enabled'),
  pdfMaxPages: z.number().optional().describe('Maximum PDF pages to parse'),
  screenshotFullPage: z.boolean().optional().describe('Full-page screenshot format option'),
  screenshotQuality: z.number().optional().describe('Screenshot quality format option'),
  viewportWidth: z.number().optional().describe('Screenshot viewport width'),
  viewportHeight: z.number().optional().describe('Screenshot viewport height'),
  jsonSchema: z
    .record(z.string(), z.any())
    .optional()
    .describe('JSON Schema for the json format'),
  jsonPrompt: z.string().optional().describe('Prompt for the json format'),
  question: z.string().optional().describe('Question for the question format'),
  highlightsQuery: z.string().optional().describe('Query for the highlights format'),
  changeTrackingModes: z
    .array(z.string())
    .optional()
    .describe('Change-tracking modes requested by Firecrawl'),
  changeTrackingTag: z.string().optional().describe('Change-tracking tag'),
  changeTrackingSchema: z
    .record(z.string(), z.any())
    .optional()
    .describe('Change-tracking JSON Schema'),
  changeTrackingPrompt: z.string().optional().describe('Change-tracking prompt')
};

export let pageMetadataSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    language: z.string().optional(),
    sourceURL: z.string().optional(),
    url: z.string().optional(),
    keywords: z.string().optional(),
    statusCode: z.number().optional(),
    contentType: z.string().optional(),
    error: z.string().optional()
  })
  .passthrough()
  .optional()
  .describe('Page metadata');

export let pageDataSchema = z.object({
  markdown: z.string().optional().describe('Page content as markdown'),
  summary: z.string().optional().describe('Page summary'),
  html: z.string().optional().describe('Cleaned HTML content'),
  rawHtml: z.string().optional().describe('Raw HTML content'),
  screenshot: z.string().optional().describe('Screenshot URL'),
  audio: z.string().optional().describe('Audio URL'),
  video: z.string().optional().describe('Video URL'),
  answer: z.string().optional().describe('Answer from question format'),
  highlights: z.string().optional().describe('Highlights from highlights format'),
  links: z.array(z.string()).optional().describe('Links found on the page'),
  images: z.array(z.any()).optional().describe('Images found on the page'),
  json: z.any().optional().describe('Structured data from json format'),
  branding: z.any().optional().describe('Branding data'),
  changeTracking: z.any().optional().describe('Change tracking data'),
  actions: z.any().optional().describe('Results from browser actions'),
  warning: z.string().optional().describe('Firecrawl warning'),
  metadata: pageMetadataSchema
});

export let idStatusOutputShape = {
  status: z.string().optional().describe('Current job status'),
  success: z.boolean().optional().describe('Whether Firecrawl marked the request successful'),
  creditsUsed: z.number().optional().describe('Credits consumed'),
  expiresAt: z.string().optional().describe('When results expire')
};

type ScrapeInput = Record<string, any>;

let buildFormat = (input: ScrapeInput, format: string) => {
  if (format === 'screenshot') {
    if (
      input.screenshotFullPage !== undefined ||
      input.screenshotQuality !== undefined ||
      input.viewportWidth !== undefined ||
      input.viewportHeight !== undefined
    ) {
      return {
        type: 'screenshot',
        fullPage: input.screenshotFullPage,
        quality: input.screenshotQuality,
        viewport:
          input.viewportWidth !== undefined || input.viewportHeight !== undefined
            ? {
                width: input.viewportWidth,
                height: input.viewportHeight
              }
            : undefined
      };
    }
    return 'screenshot';
  }

  if (format === 'json') {
    if (!input.jsonSchema && !input.jsonPrompt) {
      throw firecrawlServiceError(
        'jsonSchema or jsonPrompt is required when formats includes "json".'
      );
    }
    return {
      type: 'json',
      schema: input.jsonSchema,
      prompt: input.jsonPrompt
    };
  }

  if (format === 'question') {
    if (!input.question) {
      throw firecrawlServiceError('question is required when formats includes "question".');
    }
    return {
      type: 'question',
      question: input.question
    };
  }

  if (format === 'highlights') {
    if (!input.highlightsQuery) {
      throw firecrawlServiceError(
        'highlightsQuery is required when formats includes "highlights".'
      );
    }
    return {
      type: 'highlights',
      query: input.highlightsQuery
    };
  }

  if (format === 'changeTracking') {
    return {
      type: 'changeTracking',
      modes: input.changeTrackingModes,
      schema: input.changeTrackingSchema,
      prompt: input.changeTrackingPrompt,
      tag: input.changeTrackingTag
    };
  }

  return format;
};

export let buildFormats = (input: ScrapeInput) => {
  if (!Array.isArray(input.formats) || input.formats.length === 0) {
    return undefined;
  }

  return input.formats.map(format => buildFormat(input, format));
};

export let buildScrapeOptions = (input: ScrapeInput) => {
  let options: Record<string, unknown> = {};
  let formats = buildFormats(input);
  if (formats) options.formats = formats;
  if (input.onlyMainContent !== undefined) options.onlyMainContent = input.onlyMainContent;
  if (input.onlyCleanContent !== undefined) options.onlyCleanContent = input.onlyCleanContent;
  if (input.includeTags) options.includeTags = input.includeTags;
  if (input.excludeTags) options.excludeTags = input.excludeTags;
  if (input.maxAge !== undefined) options.maxAge = input.maxAge;
  if (input.minAge !== undefined) options.minAge = input.minAge;
  if (input.headers) options.headers = input.headers;
  if (input.waitFor !== undefined) options.waitFor = input.waitFor;
  if (input.mobile !== undefined) options.mobile = input.mobile;
  if (input.skipTlsVerification !== undefined)
    options.skipTlsVerification = input.skipTlsVerification;
  if (input.timeout !== undefined) options.timeout = input.timeout;
  if (input.actions) options.actions = input.actions;
  if (input.locationCountry || input.locationLanguages) {
    options.location = {
      country: input.locationCountry,
      languages: input.locationLanguages
    };
  }
  if (input.removeBase64Images !== undefined)
    options.removeBase64Images = input.removeBase64Images;
  if (input.blockAds !== undefined) options.blockAds = input.blockAds;
  if (input.proxy) options.proxy = input.proxy;
  if (input.storeInCache !== undefined) options.storeInCache = input.storeInCache;
  if (input.lockdown !== undefined) options.lockdown = input.lockdown;
  if (input.zeroDataRetention !== undefined)
    options.zeroDataRetention = input.zeroDataRetention;
  if (input.profileName || input.profileSaveChanges !== undefined) {
    options.profile = {
      name: input.profileName,
      saveChanges: input.profileSaveChanges
    };
  }
  if (input.disablePdfParsing) {
    options.parsers = [];
  } else if (input.pdfParserMode || input.pdfMaxPages !== undefined) {
    options.parsers = [
      {
        type: 'pdf',
        mode: input.pdfParserMode,
        maxPages: input.pdfMaxPages
      }
    ];
  }

  return options;
};

export let buildNestedScrapeOptions = (input: ScrapeInput) => {
  let { zeroDataRetention: _zeroDataRetention, ...options } = buildScrapeOptions(input);
  return options;
};

export let requireNoDomainConflict = (input: {
  includeDomains?: string[];
  excludeDomains?: string[];
}) => {
  if (input.includeDomains?.length && input.excludeDomains?.length) {
    throw firecrawlServiceError('includeDomains and excludeDomains cannot be used together.');
  }
};

export let requireBase64File = (value: string, fieldName = 'fileBase64') => {
  let dataUriMatch = /^data:([^;,]+);base64,(.*)$/s.exec(value.trim());
  let base64 = (dataUriMatch ? dataUriMatch[2]! : value).replace(/\s/g, '');

  if (!base64 || base64.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw firecrawlServiceError(`${fieldName} must be a valid base64-encoded file.`);
  }

  let bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0) {
    throw firecrawlServiceError(`${fieldName} must contain at least one byte.`);
  }

  return {
    base64,
    bytes
  };
};

export let pagesFrom = (value: any) =>
  (Array.isArray(value) ? value : []).map(page => normalizePageData(page));

export let ensureInteractInput = (input: { code?: string; prompt?: string }) => {
  let hasCode = typeof input.code === 'string' && input.code.trim().length > 0;
  let hasPrompt = typeof input.prompt === 'string' && input.prompt.trim().length > 0;

  if (hasCode === hasPrompt) {
    throw firecrawlServiceError('Provide exactly one of code or prompt.');
  }
};

export let parseMaybeJson = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

let optional = <T>(value: T | null | undefined) => value ?? undefined;

export let normalizePageData = (data: any) => ({
  markdown: optional(data?.markdown),
  summary: optional(data?.summary),
  html: optional(data?.html),
  rawHtml: optional(data?.rawHtml),
  screenshot: optional(data?.screenshot),
  audio: optional(data?.audio),
  video: optional(data?.video),
  answer: optional(data?.answer),
  highlights: optional(data?.highlights),
  links: optional(data?.links),
  images: optional(data?.images),
  json: optional(data?.json),
  branding: optional(data?.branding),
  changeTracking: optional(data?.changeTracking),
  actions: optional(data?.actions),
  warning: optional(data?.warning),
  metadata: data?.metadata
    ? {
        ...data.metadata,
        sourceURL: data.metadata.sourceURL ?? data.metadata.url,
        url: data.metadata.url
      }
    : undefined
});
