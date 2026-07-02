import { z } from 'zod';
import { IfsApplicationsClient, type IfsAuthState, projectionEndpoints } from '../lib/client';

export let apiClassSchema = z
  .enum(['premium', 'integration', 'standard', 'standardEntity'])
  .optional()
  .describe('Optional IFS API class/category to discover. Defaults to integration APIs.');

export let projectionNameSchema = z
  .string()
  .min(1)
  .max(128)
  .describe(
    'IFS projection service name without .svc, such as CustomerHandling. Must come from API discovery or API Explorer.'
  );

export let projectionEndpointSchema = z
  .enum(projectionEndpoints)
  .optional()
  .describe(
    'IFS route segment for the projection service. Defaults to int. Use main or b2b only when API Explorer, OpenAPI, or a service URL shows that endpoint.'
  );

export let entitySetSchema = z
  .string()
  .min(1)
  .max(128)
  .describe(
    'Entity set name within the projection. Use an entity set returned by the projection OpenAPI or API Explorer.'
  );

export let topSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .describe('Maximum number of records to return. Defaults to integration config or 50.');

export let skipTokenSchema = z
  .string()
  .optional()
  .describe('Opaque skip token returned as nextPageToken by a previous OData response.');

export let projectionSummarySchema = z.object({
  name: z.string().optional(),
  apiClass: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  source: z.string().optional(),
  entitySetCount: z.number().optional(),
  serviceUrl: z.string().optional(),
  openApiUrl: z.string().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
});

export let createIfsClient = (ctx: {
  auth: IfsAuthState;
  config: {
    baseUrl: string;
    defaultPageSize?: number;
  };
}) =>
  new IfsApplicationsClient({
    baseUrl: ctx.config.baseUrl,
    auth: ctx.auth,
    defaultPageSize: ctx.config.defaultPageSize
  });
