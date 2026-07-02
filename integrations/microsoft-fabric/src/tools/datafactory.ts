import { createBase64Attachment, SlateTool } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';
import { createFabricClient } from './common';
import { operationSchema } from './core';

let workspaceInputSchema = {
  workspaceId: z.string().describe('Fabric workspace ID.')
};

let listItemsInputSchema = {
  ...workspaceInputSchema,
  continuationToken: z
    .string()
    .optional()
    .describe('Continuation token from a previous page.'),
  recursive: z
    .boolean()
    .optional()
    .describe('Whether to include items from nested folders. Fabric defaults this to true.'),
  rootFolderId: z
    .string()
    .optional()
    .describe(
      'Optional Fabric folder ID to list from. If omitted, Fabric lists from the workspace root.'
    )
};

let createItemInputSchema = {
  ...workspaceInputSchema,
  displayName: z.string().describe('Display name for the new item.'),
  description: z.string().optional().describe('Optional item description.'),
  definition: z.unknown().optional().describe('Optional item definition payload.'),
  folderId: z
    .string()
    .optional()
    .describe('Optional Fabric folder ID where the item should be created.'),
  sensitivityLabelSettings: z
    .unknown()
    .optional()
    .describe('Optional Fabric sensitivity label settings for the item.')
};

export let datafactoryListPipelines = SlateTool.create(spec, {
  name: 'Data Factory List Pipelines',
  key: 'datafactory_list_pipelines',
  description:
    'Official upstream MCP name: datafactory_list-pipelines. List Data Pipelines in a Fabric workspace.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object(listItemsInputSchema))
  .output(
    z.object({
      workspaceId: z.string().describe('Fabric workspace ID.'),
      pipelines: z.array(z.unknown()).describe('Data Pipelines returned by Fabric.'),
      continuationToken: z
        .string()
        .optional()
        .describe('Continuation token for the next page.'),
      pageCount: z.number().describe('Number of pages retrieved.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createFabricClient(ctx).listDataPipelines(ctx.input);

    return {
      output: {
        workspaceId: ctx.input.workspaceId,
        pipelines: result.items,
        continuationToken: result.continuationToken,
        pageCount: result.pageCount
      },
      message: `Returned **${result.items.length}** Data Pipeline(s).`
    };
  })
  .build();

export let datafactoryCreatePipeline = SlateTool.create(spec, {
  name: 'Data Factory Create Pipeline',
  key: 'datafactory_create_pipeline',
  description:
    'Official upstream MCP name: datafactory_create-pipeline. Create a Data Pipeline in a Fabric workspace.',
  tags: { readOnly: false, destructive: false }
})
  .input(z.object(createItemInputSchema))
  .output(
    z.object({
      workspaceId: z.string().describe('Fabric workspace ID.'),
      pipeline: z.unknown().describe('Created Data Pipeline response body, when returned.'),
      operation: operationSchema.describe('HTTP and LRO operation metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createFabricClient(ctx).createDataPipeline(ctx.input);

    return {
      output: {
        workspaceId: ctx.input.workspaceId,
        pipeline: result.pipeline,
        operation: result.operation
      },
      message: `Created Data Pipeline **${ctx.input.displayName}** or started its creation operation.`
    };
  })
  .build();

export let datafactoryGetPipeline = SlateTool.create(spec, {
  name: 'Data Factory Get Pipeline',
  key: 'datafactory_get_pipeline',
  description:
    'Official upstream MCP name: datafactory_get-pipeline. Get a Data Pipeline by ID from a Fabric workspace.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...workspaceInputSchema,
      pipelineId: z.string().describe('Data Pipeline item ID.')
    })
  )
  .output(
    z.object({
      workspaceId: z.string().describe('Fabric workspace ID.'),
      pipelineId: z.string().describe('Data Pipeline item ID.'),
      pipeline: z.unknown().describe('Data Pipeline response body.')
    })
  )
  .handleInvocation(async ctx => {
    let pipeline = await createFabricClient(ctx).getDataPipeline(
      ctx.input.workspaceId,
      ctx.input.pipelineId
    );

    return {
      output: {
        workspaceId: ctx.input.workspaceId,
        pipelineId: ctx.input.pipelineId,
        pipeline
      },
      message: `Returned Data Pipeline **${ctx.input.pipelineId}**.`
    };
  })
  .build();

export let datafactoryRunPipeline = SlateTool.create(spec, {
  name: 'Data Factory Run Pipeline',
  key: 'datafactory_run_pipeline',
  description:
    'Official upstream MCP name: datafactory_run-pipeline. Start an on-demand Data Pipeline job in Fabric.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      ...workspaceInputSchema,
      pipelineId: z.string().describe('Data Pipeline item ID.'),
      jobType: z.string().optional().describe('Fabric item job type. Defaults to DefaultJob.'),
      executionData: z
        .unknown()
        .optional()
        .describe('Optional job-type-specific execution data for the on-demand run.'),
      parameters: z
        .array(
          z.object({
            name: z
              .string()
              .describe('Parameter name. Fabric requires names to be unique per run.'),
            value: z.unknown().describe('Parameter value.'),
            type: z
              .string()
              .describe(
                'Parameter type such as Text, Boolean, Number, Integer, DateTime, Guid, VariableReference, or Automatic.'
              )
          })
        )
        .optional()
        .describe(
          'Optional per-run parameter list. Fabric does not support parameters for every item type or job type.'
        )
    })
  )
  .output(
    z.object({
      workspaceId: z.string().describe('Fabric workspace ID.'),
      pipelineId: z.string().describe('Data Pipeline item ID.'),
      jobType: z.string().describe('Fabric item job type used for the run.'),
      result: z.unknown().describe('Run response body, when returned.'),
      operation: operationSchema.describe('HTTP and LRO operation metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let jobType = ctx.input.jobType ?? 'DefaultJob';
    let result = await createFabricClient(ctx).runDataPipeline({
      workspaceId: ctx.input.workspaceId,
      pipelineId: ctx.input.pipelineId,
      jobType,
      executionData: ctx.input.executionData,
      parameters: ctx.input.parameters
    });

    return {
      output: {
        workspaceId: ctx.input.workspaceId,
        pipelineId: ctx.input.pipelineId,
        jobType,
        result: result.result,
        operation: result.operation
      },
      message: `Started Data Pipeline **${ctx.input.pipelineId}**.`
    };
  })
  .build();

export let datafactoryListDataflows = SlateTool.create(spec, {
  name: 'Data Factory List Dataflows',
  key: 'datafactory_list_dataflows',
  description:
    'Official upstream MCP name: datafactory_list-dataflows. List Dataflows in a Fabric workspace.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object(listItemsInputSchema))
  .output(
    z.object({
      workspaceId: z.string().describe('Fabric workspace ID.'),
      dataflows: z.array(z.unknown()).describe('Dataflows returned by Fabric.'),
      continuationToken: z
        .string()
        .optional()
        .describe('Continuation token for the next page.'),
      pageCount: z.number().describe('Number of pages retrieved.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createFabricClient(ctx).listDataflows(ctx.input);

    return {
      output: {
        workspaceId: ctx.input.workspaceId,
        dataflows: result.items,
        continuationToken: result.continuationToken,
        pageCount: result.pageCount
      },
      message: `Returned **${result.items.length}** Dataflow(s).`
    };
  })
  .build();

export let datafactoryCreateDataflow = SlateTool.create(spec, {
  name: 'Data Factory Create Dataflow',
  key: 'datafactory_create_dataflow',
  description:
    'Official upstream MCP name: datafactory_create-dataflow. Create a Dataflow in a Fabric workspace.',
  tags: { readOnly: false, destructive: false }
})
  .input(z.object(createItemInputSchema))
  .output(
    z.object({
      workspaceId: z.string().describe('Fabric workspace ID.'),
      dataflow: z.unknown().describe('Created Dataflow response body, when returned.'),
      operation: operationSchema.describe('HTTP and LRO operation metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createFabricClient(ctx).createDataflow(ctx.input);

    return {
      output: {
        workspaceId: ctx.input.workspaceId,
        dataflow: result.dataflow,
        operation: result.operation
      },
      message: `Created Dataflow **${ctx.input.displayName}** or started its creation operation.`
    };
  })
  .build();

export let datafactoryExecuteQuery = SlateTool.create(spec, {
  name: 'Data Factory Execute Query',
  key: 'datafactory_execute_query',
  description:
    'Official upstream MCP name: datafactory_execute-query. Execute a Dataflow query and return Arrow stream results as an attachment when Fabric returns query data.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      ...workspaceInputSchema,
      dataflowId: z.string().describe('Dataflow item ID.'),
      queryName: z.string().describe('Dataflow query name to execute.'),
      query: z
        .string()
        .optional()
        .describe('Optional custom Mashup document / M expression for executeQuery.')
    })
  )
  .output(
    z.object({
      workspaceId: z.string().describe('Fabric workspace ID.'),
      dataflowId: z.string().describe('Dataflow item ID.'),
      queryName: z.string().describe('Executed query name.'),
      status: z.number().describe('HTTP status returned by Fabric.'),
      contentType: z.string().describe('Returned MIME type.'),
      size: z.number().describe('Returned response size in bytes.'),
      operation: operationSchema.describe('HTTP and LRO operation metadata.'),
      attachmentCount: z.number().describe('Number of attachments returned.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createFabricClient(ctx).executeDataflowQuery({
      workspaceId: ctx.input.workspaceId,
      dataflowId: ctx.input.dataflowId,
      queryName: ctx.input.queryName,
      customMashupDocument: ctx.input.query
    });
    let attachments = result.base64
      ? [createBase64Attachment(result.base64, result.contentType)]
      : [];

    return {
      output: {
        workspaceId: ctx.input.workspaceId,
        dataflowId: ctx.input.dataflowId,
        queryName: ctx.input.queryName,
        status: result.status,
        contentType: result.contentType,
        size: result.size,
        operation: result.operation,
        attachmentCount: attachments.length
      },
      attachments,
      message:
        attachments.length > 0
          ? `Executed Dataflow query **${ctx.input.queryName}** and returned the Arrow stream as an attachment.`
          : `Started Dataflow query **${ctx.input.queryName}** as a long-running operation.`
    };
  })
  .build();
