import { SlateTool } from 'slates';
import { z } from 'zod';
import { resolveMetorialRuntimeConfig } from '../config';
import { spec } from '../spec';
import { addResponseAttachment } from './attachments';
import { MetorialClient } from './client';
import contractJson from './contract.json';
import type { ContractTool as BaseContractTool } from './contractGuard';
import { encodeMetorialPathParam, type MetorialMethod } from './endpoints';

type ContractTool = BaseContractTool & {
  name: string;
  description: string;
  category: string;
  readOnly: boolean;
  destructive: boolean;
  params: Record<string, { in: 'path' | 'query' | 'body'; name: string }>;
};

export let contract = contractJson as unknown as {
  generatedFrom: { apiVersion: string };
  categories: { key: string; name: string; description: string }[];
  tools: ContractTool[];
};

export let INSTANCE_ID_DESCRIPTION =
  'Metorial instance ID or slug. Call instance_list to discover it. Optional when the credential is bound to a single instance.';

let addsInstanceId = (tool: ContractTool) => tool.instanceScoped && !tool.params.instance_id;

let generatedInputSchema = (tool: ContractTool) => {
  let source: Record<string, any> = addsInstanceId(tool)
    ? {
        ...tool.inputSchema,
        properties: {
          ...tool.inputSchema.properties,
          instance_id: { type: 'string', description: INSTANCE_ID_DESCRIPTION }
        }
      }
    : tool.inputSchema;

  // Keep the contract schema verbatim; Zod would otherwise rewrite it.
  return z
    .fromJSONSchema(source as z.core.JSONSchema.JSONSchema)
    .meta({ ...source, additionalProperties: true }) as z.ZodType<Record<string, any>>;
};

let buildRequest = (tool: ContractTool, input: Record<string, unknown>) => {
  let path = tool.path;
  let query: Record<string, unknown> = {};
  let body: Record<string, unknown> = {};

  for (let [field, param] of Object.entries(tool.params)) {
    let value = input[field];
    if (value === undefined) continue;

    if (param.in === 'path') {
      path = path
        .split('/')
        .map(segment =>
          segment === `:${param.name}`
            ? encodeMetorialPathParam(field, String(value))
            : segment
        )
        .join('/');
    } else if (param.in === 'query') {
      query[param.name] = value;
    } else {
      body[param.name] = value;
    }
  }

  let sendsBody =
    tool.method !== 'GET' && (tool.method !== 'DELETE' || Object.keys(body).length);

  return { path, query, body: sendsBody ? body : undefined };
};

let generatedTool = (tool: ContractTool) =>
  SlateTool.create(spec, {
    key: tool.key,
    name: tool.name,
    description: tool.description,
    tags: {
      readOnly: tool.readOnly,
      destructive: tool.destructive
    }
  })
    .input(generatedInputSchema(tool))
    .output(
      z.object({
        status: z.number().describe('HTTP response status.'),
        result: z
          .unknown()
          .describe(
            'JSON response returned by Metorial. Null for empty responses and for responses prepared as a downloadable file.'
          )
      })
    )
    .handleInvocation(async ctx => {
      let input = ctx.input as Record<string, unknown>;
      let client = new MetorialClient({
        ...resolveMetorialRuntimeConfig(ctx.config, ctx.auth),
        apiVersion: contract.generatedFrom.apiVersion
      });
      let request = buildRequest(tool, input);
      let response = await client.callEndpoint({
        method: tool.method.toLowerCase() as MetorialMethod,
        path: request.path,
        token: ctx.auth.token,
        instanceId: addsInstanceId(tool)
          ? (input.instance_id as string | undefined)
          : undefined,
        query: request.query,
        body: request.body
      });

      if (response.kind === 'json' || response.kind === 'empty') {
        return {
          output: {
            status: response.status,
            result: response.kind === 'json' ? response.data : null
          },
          message: `Called ${tool.name}.`
        };
      }

      await addResponseAttachment(ctx, response);

      return {
        output: { status: response.status, result: null },
        message: `Called ${tool.name} and prepared the response for download.`
      };
    })
    .build();

let toolsByCategory = new Map<string, ReturnType<typeof generatedTool>[]>();

export let generatedTools = contract.tools.map(tool => {
  let built = generatedTool(tool);
  toolsByCategory.set(tool.category, [...(toolsByCategory.get(tool.category) ?? []), built]);
  return built;
});

export let generatedToolsByCategory = (category: string) =>
  toolsByCategory.get(category) ?? [];
