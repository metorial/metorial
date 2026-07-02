import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { spec } from '../spec';

export let queryServingEndpoint = SlateTool.create(spec, {
  name: 'Query Serving Endpoint',
  key: 'query_serving_endpoint',
  description: `Send an inference request to a model serving endpoint. Works with both custom ML models and Foundation Model APIs. The request format follows OpenAI-compatible chat/completions or generic model input schemas.`,
  instructions: [
    'For Foundation Model APIs, use the "messages" field with OpenAI-compatible format.',
    'For custom models, use "dataframeRecords" or "inputs" depending on model type.'
  ]
})
  .input(
    z.object({
      endpointName: z.string().describe('Name of the serving endpoint to query'),
      messages: z
        .array(
          z.object({
            role: z.string().describe('Message role (system, user, assistant)'),
            content: z.string().describe('Message content')
          })
        )
        .optional()
        .describe('Chat messages for Foundation Model APIs (OpenAI format)'),
      maxTokens: z.number().optional().describe('Max tokens for completion'),
      temperature: z.number().optional().describe('Sampling temperature'),
      dataframeRecords: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Input rows for custom model endpoints'),
      inputs: z.any().optional().describe('Raw model inputs')
    })
  )
  .output(
    z.object({
      response: z.any().describe('Full response from the serving endpoint')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    let payload: Record<string, any> = {};
    if (ctx.input.messages) {
      payload.messages = ctx.input.messages;
      if (ctx.input.maxTokens) payload.max_tokens = ctx.input.maxTokens;
      if (ctx.input.temperature !== undefined) payload.temperature = ctx.input.temperature;
    } else if (ctx.input.dataframeRecords) {
      payload.dataframe_records = ctx.input.dataframeRecords;
    } else if (ctx.input.inputs) {
      payload.inputs = ctx.input.inputs;
    }

    let response = await client.queryServingEndpoint(ctx.input.endpointName, payload);

    return {
      output: { response },
      message: `Queried endpoint **${ctx.input.endpointName}** successfully.`
    };
  })
  .build();
