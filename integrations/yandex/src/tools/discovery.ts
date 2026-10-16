import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import * as compute from '../lib/compute';
import * as functions from '../lib/functions';
import * as iam from '../lib/iam';
import * as logging from '../lib/logging';
import * as operations from '../lib/operations';
import * as storage from '../lib/storage';
import { spec } from '../spec';

let folderId = z
  .string()
  .optional()
  .describe(
    'Folder ID. Call list_clouds, then list_folders to discover authorized folders. Uses the configured default when omitted.'
  );
let pageSize = z.number().optional().describe('Maximum results per page, up to 1000');
let pageToken = z
  .string()
  .optional()
  .describe('Continuation token returned by the previous request');
let resource = z
  .object({
    id: z.string().describe('Provider resource ID'),
    name: z.string().optional().describe('Resource name')
  })
  .passthrough();

export let getOperation = SlateTool.create(spec, {
  key: 'get_operation',
  name: 'Get Operation',
  description:
    'Check a Yandex Cloud asynchronous operation by the operationId returned by a resource change. Inspect done and the provider response before considering the change complete.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      operationId: z.string().describe('Operation ID returned by a resource change')
    })
  )
  .output(
    z
      .object({
        id: z.string().describe('Operation ID'),
        done: z.boolean().optional().describe('Whether processing is complete'),
        metadata: z
          .unknown()
          .optional()
          .describe('Provider operation metadata, including target resource IDs'),
        response: z
          .unknown()
          .optional()
          .describe('Provider result after successful completion'),
        error: z.unknown().optional().describe('Provider failure information')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => ({
    output: await operations.getOperation(ctx.auth, ctx.input.operationId),
    message: 'Retrieved operation status.'
  }))
  .build();

export let listFolderBuckets = SlateTool.create(spec, {
  key: 'list_folder_buckets',
  name: 'List Folder Buckets',
  description:
    'Discover Object Storage buckets in a folder using the Yandex Cloud management API with IAM authentication. Returns bucket identifiers, names, settings, and pagination metadata.',
  tags: { readOnly: true }
})
  .input(z.object({ folderId, pageSize, pageToken }))
  .output(
    z
      .object({
        buckets: z.array(resource).optional().describe('Buckets returned by the provider'),
        nextPageToken: pageToken
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let folder = ctx.input.folderId || ctx.config.folderId;
    if (!folder)
      throw createApiServiceError(
        'Provide folderId; call list_clouds and list_folders to discover it.'
      );
    return {
      output: await storage.listFolderBuckets(
        ctx.auth,
        folder,
        ctx.input.pageSize,
        ctx.input.pageToken
      ),
      message: 'Retrieved folder buckets.'
    };
  })
  .build();

export let listFunctionVersions = SlateTool.create(spec, {
  key: 'list_function_versions',
  name: 'List Function Versions',
  description:
    'List deployed versions of a Cloud Function, including runtime, entrypoint, resource settings, version IDs, and tags. Call list_functions to discover function IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      functionId: z.string().describe('Function ID from list_functions'),
      pageSize,
      pageToken
    })
  )
  .output(
    z
      .object({
        versions: z
          .array(resource)
          .optional()
          .describe('Function versions returned by the provider'),
        nextPageToken: pageToken
      })
      .passthrough()
  )
  .handleInvocation(async ctx => ({
    output: await functions.listFunctionVersions(
      ctx.auth,
      ctx.input.functionId,
      ctx.input.pageSize,
      ctx.input.pageToken
    ),
    message: 'Retrieved function versions.'
  }))
  .build();

export let listLogGroups = SlateTool.create(spec, {
  key: 'list_log_groups',
  name: 'List Log Groups',
  description:
    'Discover Cloud Logging groups in a folder and their IDs, names, status, and retention settings. Use a returned group ID when reading or writing logs.',
  tags: { readOnly: true }
})
  .input(z.object({ folderId, pageSize, pageToken }))
  .output(
    z
      .object({
        groups: z.array(resource).optional().describe('Log groups returned by the provider'),
        nextPageToken: pageToken
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let folder = ctx.input.folderId || ctx.config.folderId;
    if (!folder)
      throw createApiServiceError(
        'Provide folderId; call list_clouds and list_folders to discover it.'
      );
    return {
      output: await logging.listLogGroups(
        ctx.auth,
        folder,
        ctx.input.pageSize,
        ctx.input.pageToken
      ),
      message: 'Retrieved log groups.'
    };
  })
  .build();

export let getServiceAccount = SlateTool.create(spec, {
  key: 'get_service_account',
  name: 'Get Service Account',
  description:
    'Get an IAM service account by ID, including its folder, name, and provider metadata. Call list_service_accounts to discover authorized accounts.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      serviceAccountId: z.string().describe('Service account ID from list_service_accounts')
    })
  )
  .output(resource)
  .handleInvocation(async ctx => ({
    output: await iam.getServiceAccount(ctx.auth, ctx.input.serviceAccountId),
    message: 'Retrieved service account.'
  }))
  .build();

export let listComputeImages = SlateTool.create(spec, {
  key: 'list_compute_images',
  name: 'List Compute Images',
  description:
    'Discover VM images in a Compute Cloud folder. Use returned image IDs when creating a VM boot disk or a disk from an image.',
  tags: { readOnly: true }
})
  .input(z.object({ folderId, pageSize, pageToken }))
  .output(
    z
      .object({
        images: z
          .array(resource)
          .optional()
          .describe('Compute images returned by the provider'),
        nextPageToken: pageToken
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let folder = ctx.input.folderId || ctx.config.folderId;
    if (!folder)
      throw createApiServiceError(
        'Provide folderId; call list_clouds and list_folders to discover it.'
      );
    return {
      output: await compute.listImages(
        ctx.auth,
        folder,
        ctx.input.pageSize,
        ctx.input.pageToken
      ),
      message: 'Retrieved compute images.'
    };
  })
  .build();
