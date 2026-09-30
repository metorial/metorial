import { createApiServiceError } from 'slates';
import { z } from 'zod';
import { type ApiRecord, ContextClient } from '../lib/client';
import {
  addBase64File,
  addHostedImage,
  addImageDataUrl,
  decodeFileBase64,
  deliverInlineImages,
  fileMetadataSchema
} from '../lib/files';
import { cacheMetadataSchema, keyMetadataSchema, responseMetadata } from '../lib/response';
import { contextTool, officialContract } from '../lib/tools';

const metadataSchema = z
  .object({
    sourceUrl: z.string().optional(),
    finalUrl: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional()
  })
  .passthrough();

const outputStatus = {
  requested: z.boolean(),
  success: z.boolean().nullable(),
  error_code: z.string().optional(),
  message: z.string().optional()
};
const outputValue = <T extends z.ZodType>(data: T) =>
  z
    .object({
      ...outputStatus,
      data: data.nullable()
    })
    .passthrough();
const fileOutputSchema = z
  .object({ ...outputStatus, file: fileMetadataSchema.nullable() })
  .passthrough();
const objectSchema = z.record(z.string(), z.unknown());

export const validatePageRange = (
  value: ApiRecord | undefined,
  label: string,
  start = 'start',
  end = 'end'
) => {
  if (
    value?.[start] !== undefined &&
    value?.[end] !== undefined &&
    value[end] < value[start]
  ) {
    throw createApiServiceError(
      `${label}.${end} must be greater than or equal to ${label}.${start}.`
    );
  }
};

const validateScrapeTimeout = (timeout: ApiRecord | undefined) => {
  if (timeout?.behavior === 'return-partial' && timeout.milliseconds < 5000) {
    throw createApiServiceError(
      'A scrape with return-partial requires timeoutOpts.milliseconds of at least 5000.'
    );
  }
};

const validateScrape = (input: ApiRecord) => {
  const formats = input.formats;
  if (!Object.values(formats).some(value => value === true)) {
    throw createApiServiceError('Set at least one formats field to true.');
  }
  const groups = {
    markdownParams: 'markdown',
    screenshotParams: 'screenshot',
    imageParams: 'images',
    parseParams: 'parse',
    highlightsParams: 'highlights',
    jsonParams: 'json',
    productParams: 'product'
  };
  for (const [parameter, format] of Object.entries(groups)) {
    if (input[parameter] !== undefined && formats[format] !== true) {
      throw createApiServiceError(`${parameter} requires formats.${format} to be true.`);
    }
  }
  for (const [parameter, format] of [
    ['parseParams', 'parse'],
    ['highlightsParams', 'highlights'],
    ['jsonParams', 'json']
  ]) {
    if (formats[format!] === true && input[parameter!] === undefined) {
      throw createApiServiceError(`Provide ${parameter} when formats.${format} is true.`);
    }
  }
  if (
    input.markdownParams?.inlineImages !== undefined &&
    input.markdownParams.includeImages !== true
  ) {
    throw createApiServiceError(
      'markdownParams.inlineImages requires markdownParams.includeImages to be true.'
    );
  }
  if (input.jsonParams) {
    const schema = input.jsonParams.schema;
    if (schema.type !== 'object') {
      throw createApiServiceError(
        'jsonParams.schema must describe one top-level JSON object.'
      );
    }
    if (Buffer.byteLength(JSON.stringify(schema)) > 50 * 1024) {
      throw createApiServiceError('jsonParams.schema must be at most 50 KB.');
    }
  }
  const area = input.screenshotParams?.area;
  if (typeof area === 'object' && area.width * area.height > 40_000_000) {
    throw createApiServiceError(
      'The screenshot rectangle must contain at most 40 million pixels. Reduce its width or height.'
    );
  }
  validatePageRange(
    input.sharedParams?.parsers?.pdf,
    'sharedParams.parsers.pdf',
    'startPage',
    'endPage'
  );
  validateScrapeTimeout(input.timeoutOpts);
  const waits =
    (typeof input.sharedParams?.waitFor === 'number' ? input.sharedParams.waitFor : 0) +
    (input.sharedParams?.actions ?? []).reduce(
      (total: number, action: ApiRecord) =>
        total + (action.type === 'wait' ? action.milliseconds : 0),
      0
    );
  if (waits >= (input.timeoutOpts?.milliseconds ?? 90_000)) {
    throw createApiServiceError(
      'Fixed browser waits must finish before timeoutOpts.milliseconds. Shorten the waits or increase the deadline.'
    );
  }
};

const webScrapeSchema = z
  .object({
    url: z.string(),
    isPartial: z.boolean().optional(),
    html: outputValue(z.string()),
    markdown: outputValue(z.string()),
    screenshot: fileOutputSchema,
    images: outputValue(
      z.array(
        z
          .object({
            url: z.string().optional(),
            alt: z.string().nullable().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
            file: fileMetadataSchema.optional()
          })
          .passthrough()
      )
    ),
    bytes: fileOutputSchema,
    parsed: outputValue(objectSchema),
    highlights: outputValue(z.array(z.string())),
    json: outputValue(objectSchema),
    product: outputValue(
      z.object({ isProductPage: z.boolean(), product: objectSchema.nullable() }).passthrough()
    ),
    metadata: metadataSchema,
    cache_metadata: cacheMetadataSchema,
    ...responseMetadata
  })
  .passthrough();

const rawScrapeSchema = webScrapeSchema.extend({
  screenshot: outputValue(z.string()),
  bytes: outputValue(z.object({ base64: z.string(), contentType: z.string() })),
  images: outputValue(
    z.array(z.object({ url: z.string(), alt: z.string().nullable().optional() }).passthrough())
  )
});

export const webScrape = contextTool('web-scrape', {
  description: officialContract['web-scrape'].description
    .replace('a screenshot', 'a downloadable screenshot')
    .replace('original bytes', 'a downloadable original source file')
})
  .output(webScrapeSchema)
  .handleInvocation(async ctx => {
    validateScrape(ctx.input);
    const response = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof rawScrapeSchema>
    >('scrape web page', {
      method: 'POST',
      path: '/web/scrape',
      body: ctx.input
    });
    const { data: screenshotData, ...screenshot } = response.screenshot;
    const screenshotFile =
      screenshot.success === true
        ? await addImageDataUrl(ctx, screenshotData!, 'screenshot')
        : null;
    const { data: bytesData, ...bytes } = response.bytes;
    const sourceFile =
      bytes.success === true
        ? await addBase64File(ctx, bytesData!.base64, bytesData!.contentType, 'page-source')
        : null;
    const images = [];
    for (const [index, image] of (response.images.data ?? []).entries()) {
      const { fileUrl, ...imageDetails } = image;
      const hostedFile =
        typeof fileUrl === 'string'
          ? await addHostedImage(ctx, fileUrl, `page-image-${index + 1}`)
          : undefined;
      if (image.url?.startsWith('data:')) {
        const { url: _url, ...details } = imageDetails;
        images.push({
          ...details,
          file:
            hostedFile ?? (await addImageDataUrl(ctx, image.url, `page-image-${index + 1}`))
        });
      } else images.push({ ...imageDetails, ...(hostedFile ? { file: hostedFile } : {}) });
    }
    const output = await deliverInlineImages(ctx, {
      ...response,
      screenshot: { ...screenshot, file: screenshotFile },
      bytes: { ...bytes, file: sourceFile },
      images: { ...response.images, data: response.images.data === null ? null : images }
    });
    const failures = Object.entries(ctx.input.formats).filter(
      ([key, requested]) =>
        requested &&
        (response as ApiRecord)[key === 'parse' ? 'parsed' : key]?.success === false
    ).length;
    return {
      output,
      message: failures
        ? `Read ${response.url} with ${failures} incomplete output${failures === 1 ? '' : 's'}. Inspect each output's status.`
        : `Read ${response.url}.`
    };
  })
  .build();

const webMapSchema = z
  .object({
    success: z.boolean(),
    domain: z.string(),
    urls: z.array(
      z
        .object({
          url: z.string(),
          title: z.string().optional(),
          description: z.string().optional(),
          keywords: z.array(z.string()).optional(),
          language: z.string().optional()
        })
        .passthrough()
    ),
    partial: z.boolean().optional(),
    ...responseMetadata
  })
  .passthrough();

export const webMap = contextTool('web-map')
  .output(webMapSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof webMapSchema>
    >('map website URLs', {
      method: 'GET',
      path: '/web/urls',
      query: ctx.input
    });
    return {
      output,
      message: `Found ${output.urls.length} URLs for ${output.domain}${output.partial ? ' before the deadline' : ''}.`
    };
  })
  .build();

const webCrawlSchema = z
  .object({
    results: z.array(
      z
        .object({
          markdown: z.string(),
          metadata: z
            .object({
              url: z.string(),
              title: z.string(),
              crawlDepth: z.number(),
              statusCode: z.number(),
              success: z.boolean()
            })
            .passthrough()
        })
        .passthrough()
    ),
    metadata: z
      .object({
        numUrls: z.number(),
        maxCrawlDepth: z.number(),
        numSucceeded: z.number(),
        numFailed: z.number(),
        numSkipped: z.number()
      })
      .passthrough(),
    partial: z.boolean().optional(),
    cache_metadata: cacheMetadataSchema,
    ...responseMetadata
  })
  .passthrough();

export const webCrawl = contextTool('web-crawl')
  .output(webCrawlSchema)
  .handleInvocation(async ctx => {
    validatePageRange(ctx.input.pdf, 'pdf');
    const response = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof webCrawlSchema>
    >('crawl website', {
      method: 'POST',
      path: '/web/crawl',
      body: ctx.input
    });
    const output = await deliverInlineImages(ctx, response);
    return {
      output,
      message: `Crawled ${output.metadata.numUrls} URLs: ${output.metadata.numSucceeded} succeeded and ${output.metadata.numFailed} failed${output.partial ? ' before the deadline' : ''}.`
    };
  })
  .build();

const pageOutcomeSchema = z.enum([
  'SUCCESS',
  'NOT_REQUESTED',
  'TIMEOUT',
  'CONTENT_TOO_LARGE',
  'WEBSITE_ACCESS_ERROR',
  'ERROR'
]);
const webSearchSchema = z
  .object({
    query: z.string(),
    results: z.array(
      z
        .object({
          url: z.string(),
          title: z.string(),
          description: z.string(),
          relevance: z.enum(['high', 'medium', 'low']),
          markdown: z
            .object({
              markdown: z.string().nullable(),
              code: pageOutcomeSchema,
              finalDOMState: z.string().optional()
            })
            .passthrough(),
          highlights: z
            .object({ highlights: z.array(z.string()).nullable(), code: pageOutcomeSchema })
            .passthrough()
        })
        .passthrough()
    ),
    partial: z.boolean().optional(),
    cache_metadata: cacheMetadataSchema,
    ...responseMetadata
  })
  .passthrough();

export const webSearch = contextTool('web-search')
  .output(webSearchSchema)
  .handleInvocation(async ctx => {
    validatePageRange(ctx.input.markdownOptions?.pdf, 'markdownOptions.pdf');
    validateScrapeTimeout(ctx.input.markdownOptions?.timeoutOpts);
    const response = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof webSearchSchema>
    >('search web', {
      method: 'POST',
      path: '/web/search',
      body: ctx.input
    });
    const output = await deliverInlineImages(ctx, response);
    return {
      output,
      message: `Found ${output.results.length} results for “${output.query}”${output.partial ? ' before the deadline' : ''}.`
    };
  })
  .build();

const webAnswersSchema = z
  .object({
    json_content: objectSchema.describe('Research answer in the requested shape.'),
    sources: z.array(z.string()).describe('Evidence URLs used for the answer.'),
    partial: z.boolean().optional(),
    key_metadata: keyMetadataSchema.optional()
  })
  .passthrough();

export const webAnswers = contextTool('web-answers')
  .output(webAnswersSchema)
  .handleInvocation(async ctx => {
    const response = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof webAnswersSchema>
    >('research web answer', {
      method: 'POST',
      path: '/web/answers',
      body: ctx.input
    });
    const output = await deliverInlineImages(ctx, response);
    return {
      output,
      message: `Researched the task using ${output.sources.length} source${output.sources.length === 1 ? '' : 's'}${output.partial ? ' before the deadline' : ''}.`
    };
  })
  .build();

const parseDocumentSchema = z
  .object({
    success: z.boolean(),
    markdown: z.string(),
    type: z.string(),
    ...responseMetadata
  })
  .passthrough();

export const parseDocument = contextTool('parse-document')
  .output(parseDocumentSchema)
  .handleInvocation(async ctx => {
    validatePageRange(ctx.input.pdf, 'pdf');
    const { fileBase64, pdf, ...query } = ctx.input;
    const body = decodeFileBase64(fileBase64, 25 * 1024 * 1024, 'fileBase64');
    const response = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof parseDocumentSchema>
    >('parse document', {
      method: 'POST',
      path: '/parse',
      query: { ...query, ...(pdf === undefined ? {} : { pdf: JSON.stringify(pdf) }) },
      body,
      headers: { 'Content-Type': 'application/octet-stream' }
    });
    const output = await deliverInlineImages(ctx, response);
    return { output, message: `Parsed the document as ${output.type}.` };
  })
  .build();

export const webTools = [webScrape, webMap, webCrawl, webSearch, webAnswers, parseDocument];
