import { SlateTool } from 'slates';
import { z } from 'zod';
import * as functions from '../lib/functions';
import { spec } from '../spec';

export let listFunctions = SlateTool.create(spec, {
  name: 'List Functions',
  key: 'list_functions',
  description: `List all serverless functions in a Yandex Cloud Functions folder. Returns function metadata including name, status, and invoke URL.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Folder ID to list functions from'),
      pageSize: z.number().optional().describe('Maximum number of results'),
      pageToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      functions: z
        .array(
          z.object({
            functionId: z.string().describe('Function ID'),
            name: z.string().optional().describe('Function name'),
            description: z.string().optional().describe('Function description'),
            folderId: z.string().optional().describe('Folder ID'),
            httpInvokeUrl: z.string().optional().describe('HTTP invoke URL'),
            status: z.string().optional().describe('Function status'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            labels: z.record(z.string(), z.string()).optional().describe('Function labels')
          })
        )
        .describe('List of serverless functions'),
      nextPageToken: z.string().optional().describe('Next page token')
    })
  )
  .handleInvocation(async ctx => {
    let folderId = ctx.input.folderId || ctx.config.folderId;
    if (!folderId) throw new Error('folderId is required either in input or config');

    let result = await functions.listFunctions(
      ctx.auth,
      folderId,
      ctx.input.pageSize,
      ctx.input.pageToken
    );
    let fns = (result.functions || []).map((f: any) => ({
      functionId: f.id,
      name: f.name,
      description: f.description,
      folderId: f.folderId,
      httpInvokeUrl: f.httpInvokeUrl,
      status: f.status,
      createdAt: f.createdAt,
      labels: f.labels
    }));

    return {
      output: {
        functions: fns,
        nextPageToken: result.nextPageToken
      },
      message: `Found ${fns.length} function(s) in folder ${folderId}.`
    };
  })
  .build();

export let getFunction = SlateTool.create(spec, {
  name: 'Get Function',
  key: 'get_function',
  description: `Get detailed information about a specific Yandex Cloud Function, including its status, HTTP invoke URL, and version details.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      functionId: z.string().describe('ID of the function to retrieve')
    })
  )
  .output(
    z.object({
      functionId: z.string().describe('Function ID'),
      name: z.string().optional().describe('Function name'),
      description: z.string().optional().describe('Function description'),
      folderId: z.string().optional().describe('Folder ID'),
      httpInvokeUrl: z.string().optional().describe('HTTP invoke URL'),
      status: z.string().optional().describe('Function status'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      logGroupId: z.string().optional().describe('Log group ID'),
      labels: z.record(z.string(), z.string()).optional().describe('Function labels')
    })
  )
  .handleInvocation(async ctx => {
    let result = await functions.getFunction(ctx.auth, ctx.input.functionId);

    return {
      output: {
        functionId: result.id,
        name: result.name,
        description: result.description,
        folderId: result.folderId,
        httpInvokeUrl: result.httpInvokeUrl,
        status: result.status,
        createdAt: result.createdAt,
        logGroupId: result.logGroupId,
        labels: result.labels
      },
      message: `Function **${result.name || result.id}** status: **${result.status}**.`
    };
  })
  .build();

export let createFunction = SlateTool.create(spec, {
  name: 'Create Function',
  key: 'create_function',
  description: `Create a new serverless function in Yandex Cloud Functions. The function is created as a container; you will need to create a version to deploy code.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Folder ID to create the function in'),
      name: z.string().describe('Name for the new function'),
      description: z.string().optional().describe('Description for the function'),
      labels: z.record(z.string(), z.string()).optional().describe('Labels for the function')
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('ID of the create operation'),
      functionId: z.string().optional().describe('ID of the created function'),
      done: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    let folderId = ctx.input.folderId || ctx.config.folderId;
    if (!folderId) throw new Error('folderId is required either in input or config');

    let result = await functions.createFunction(ctx.auth, {
      folderId,
      name: ctx.input.name,
      description: ctx.input.description,
      labels: ctx.input.labels
    });

    return {
      output: {
        operationId: result.id,
        functionId: result.metadata?.functionId,
        done: result.done || false
      },
      message: `Function creation initiated. Operation ID: **${result.id}**.`
    };
  })
  .build();

export let deleteFunction = SlateTool.create(spec, {
  name: 'Delete Function',
  key: 'delete_function',
  description: `Delete a serverless function from Yandex Cloud Functions. This permanently removes the function and all its versions.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      functionId: z.string().describe('ID of the function to delete')
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('ID of the delete operation'),
      done: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    let result = await functions.deleteFunction(ctx.auth, ctx.input.functionId);

    return {
      output: {
        operationId: result.id,
        done: result.done || false
      },
      message: `Function **${ctx.input.functionId}** deletion initiated.`
    };
  })
  .build();

export let invokeFunction = SlateTool.create(spec, {
  name: 'Invoke Function',
  key: 'invoke_function',
  description: `Invoke a Yandex Cloud Function via HTTPS. Pass optional JSON payload to the function and receive the response.`
})
  .input(
    z.object({
      functionId: z.string().describe('ID of the function to invoke'),
      payload: z.any().optional().describe('JSON payload to pass to the function')
    })
  )
  .output(
    z.object({
      response: z.any().describe('Response from the function')
    })
  )
  .handleInvocation(async ctx => {
    let result = await functions.invokeFunction(
      ctx.auth,
      ctx.input.functionId,
      ctx.input.payload
    );

    return {
      output: {
        response: result
      },
      message: `Function **${ctx.input.functionId}** invoked successfully.`
    };
  })
  .build();
