import { createApiServiceError } from 'slates';
import { z } from 'zod';

let requestInfo = z
  .object({
    redirects: z.number().optional(),
    host: z.string().optional(),
    responseCode: z.number().optional(),
    responseContentType: z.string().optional()
  })
  .passthrough();

export let metadataResponse = z
  .object({
    hybridGraph: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        image: z.string().optional(),
        url: z.string().optional(),
        siteName: z.string().optional(),
        site_name: z.string().optional(),
        type: z.string().optional(),
        favicon: z.string().optional()
      })
      .passthrough()
      .optional(),
    openGraph: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        type: z.string().optional(),
        url: z.string().optional(),
        siteName: z.string().optional(),
        site_name: z.string().optional(),
        image: z.object({ url: z.string().optional() }).passthrough().optional()
      })
      .passthrough()
      .optional(),
    htmlInferred: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        favicon: z.string().optional()
      })
      .passthrough()
      .optional(),
    requestInfo: requestInfo.optional()
  })
  .passthrough();

export let scrapeResponse = z
  .object({ htmlContent: z.string(), requestInfo: requestInfo.optional() })
  .passthrough();

export let screenshotResponse = z
  .object({
    screenshotUrl: z.string().url(),
    dimensions: z
      .object({ width: z.number().optional(), height: z.number().optional() })
      .passthrough()
      .optional(),
    requestInfo: requestInfo.optional()
  })
  .passthrough();

export let extractResponse = z
  .object({
    tags: z.array(
      z.object({ tag: z.string(), innerText: z.string(), position: z.number() }).passthrough()
    ),
    concatenatedText: z.string().optional(),
    requestInfo: requestInfo.optional()
  })
  .passthrough();

export let queryResponse = z
  .object({ answer: z.unknown(), requestInfo: requestInfo.optional() })
  .passthrough();

export let parseResponse = <T extends z.ZodType>(data: unknown, schema: T): z.output<T> => {
  let result = schema.safeParse(data);
  if (!result.success) {
    throw createApiServiceError(
      'OpenGraph.io returned an incomplete or unsupported response. Try the request again.',
      { reason: 'opengraphio_invalid_response' }
    );
  }
  return result.data;
};
