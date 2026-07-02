import { createTextAttachment, SlateTool } from '@slates/provider';
import { z } from 'zod';
import {
  bestPracticesResource,
  createDocsResource,
  examplesResource,
  itemDefinitionsResource,
  platformApiResource,
  resolveWorkload,
  workloadApiResource,
  workloads
} from '../lib/docs-resources';
import { spec } from '../spec';
import { stringifyAttachment } from './common';

let docsOutputSchema = z.object({
  title: z.string().describe('Title of the returned documentation resource.'),
  sourceUrls: z.array(z.string()).describe('Microsoft source URLs used for this resource.'),
  attachmentCount: z.number().describe('Number of documentation attachments returned.')
});

let returnDocsResource = (resource: {
  title: string;
  sourceUrls: string[];
  generatedAt: string;
  payload: unknown;
}) => ({
  output: {
    title: resource.title,
    sourceUrls: resource.sourceUrls,
    attachmentCount: 1
  },
  attachments: [createTextAttachment(stringifyAttachment(resource), 'application/json')],
  message: `Returned **${resource.title}** as a documentation attachment.`
});

export let docsWorkloads = SlateTool.create(spec, {
  name: 'Docs Workloads',
  key: 'docs_workloads',
  description:
    'Official upstream MCP name: docs_workloads. List Microsoft Fabric workloads known to the docs resource index and return the compact resource as an attachment.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      workloadType: z
        .string()
        .optional()
        .describe('Optional workload key, name, or item type to focus the response.'),
      includeExamples: z
        .boolean()
        .optional()
        .describe('Include example/spec URLs for each workload in the attachment.')
    })
  )
  .output(
    docsOutputSchema.extend({
      workloadCount: z.number().describe('Number of workloads returned.')
    })
  )
  .handleInvocation(async ctx => {
    let selected = ctx.input.workloadType
      ? [resolveWorkload(ctx.input.workloadType)]
      : workloads;
    let resource = createDocsResource({
      title: ctx.input.workloadType
        ? `Microsoft Fabric workload: ${selected[0]?.name}`
        : 'Microsoft Fabric workloads',
      sourceUrls: ['https://learn.microsoft.com/en-us/rest/api/fabric/articles/'],
      payload: {
        workloads: selected.map(workload => ({
          key: workload.key,
          name: workload.name,
          itemTypes: workload.itemTypes,
          docsUrl: workload.docsUrl,
          apiSpecUrl: ctx.input.includeExamples ? workload.apiSpecUrl : undefined,
          examplesUrl: ctx.input.includeExamples ? workload.examplesUrl : undefined
        }))
      }
    });

    let result = returnDocsResource(resource);
    return {
      ...result,
      output: {
        ...result.output,
        workloadCount: selected.length
      }
    };
  })
  .build();

export let docsWorkloadApiSpec = SlateTool.create(spec, {
  name: 'Docs Workload API Spec',
  key: 'docs_workload_api_spec',
  description:
    'Official upstream MCP name: docs_workload-api-spec. Return compact API-spec metadata for a Fabric workload as an attachment.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      workloadType: z.string().describe('Fabric workload key, display name, or item type.')
    })
  )
  .output(docsOutputSchema)
  .handleInvocation(async ctx => {
    return returnDocsResource(workloadApiResource(ctx.input.workloadType));
  })
  .build();

export let docsPlatformApiSpec = SlateTool.create(spec, {
  name: 'Docs Platform API Spec',
  key: 'docs_platform_api_spec',
  description:
    'Official upstream MCP name: docs_platform-api-spec. Return compact Fabric platform API metadata, scopes, pagination, and LRO conventions as an attachment.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      area: z
        .string()
        .optional()
        .describe('Optional platform area to highlight, such as core.')
    })
  )
  .output(docsOutputSchema)
  .handleInvocation(async ctx => returnDocsResource(platformApiResource(ctx.input.area)))
  .build();

export let docsItemDefinitions = SlateTool.create(spec, {
  name: 'Docs Item Definitions',
  key: 'docs_item_definitions',
  description:
    'Official upstream MCP name: docs_item-definitions. Return Fabric item definition shape and item-type notes as an attachment.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      itemType: z.string().optional().describe('Optional Fabric item type to focus on.')
    })
  )
  .output(docsOutputSchema)
  .handleInvocation(async ctx =>
    returnDocsResource(itemDefinitionsResource(ctx.input.itemType))
  )
  .build();

export let docsBestPractices = SlateTool.create(spec, {
  name: 'Docs Best Practices',
  key: 'docs_best_practices',
  description:
    'Official upstream MCP name: docs_best-practices. Return compact Microsoft Fabric implementation best practices as an attachment.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      topic: z.string().optional().describe('Optional best-practice topic to focus on.')
    })
  )
  .output(docsOutputSchema)
  .handleInvocation(async ctx => returnDocsResource(bestPracticesResource(ctx.input.topic)))
  .build();

export let docsApiExamples = SlateTool.create(spec, {
  name: 'Docs API Examples',
  key: 'docs_api_examples',
  description:
    'Official upstream MCP name: docs_api-examples. Return compact Fabric API examples and source links as an attachment.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      workloadType: z
        .string()
        .optional()
        .describe('Optional workload key, display name, or item type.'),
      operation: z.string().optional().describe('Optional operation name to highlight.')
    })
  )
  .output(docsOutputSchema)
  .handleInvocation(async ctx =>
    returnDocsResource(examplesResource(ctx.input.workloadType, ctx.input.operation))
  )
  .build();
