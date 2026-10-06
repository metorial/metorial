import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

let settings = {
  generalPrompt: z.string().nullable().optional().describe('System prompt; null clears it'),
  beginMessage: z
    .string()
    .nullable()
    .optional()
    .describe('Opening message; empty string waits for the user'),
  model: z
    .string()
    .optional()
    .describe('Supported Retell model ID; omit to use the provider default'),
  modelTemperature: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Model temperature from 0 to 1'),
  knowledgeBaseIds: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Knowledge bases from list_knowledge_bases; null removes them'),
  defaultDynamicVariables: z
    .record(z.string(), z.string())
    .nullable()
    .optional()
    .describe('Default prompt variable values'),
  generalTools: z
    .array(z.record(z.string(), z.unknown()))
    .nullable()
    .optional()
    .describe('Provider tool definitions such as end_call and custom functions'),
  additionalSettings: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Other documented Retell LLM configuration fields')
};
let outputSchema = z.object({
  llmId: z.string().describe('Response engine ID used as responseEngine.llm_id on an agent'),
  version: z.number().optional().describe('Response engine version'),
  isPublished: z.boolean().optional().describe('Publication state'),
  generalPrompt: z.string().nullable().optional(),
  beginMessage: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  knowledgeBaseIds: z.array(z.string()).nullable().optional(),
  generalTools: z
    .array(z.record(z.string(), z.unknown()))
    .nullable()
    .optional()
    .describe('Configured provider tools'),
  modelTemperature: z.number().nullable().optional(),
  defaultDynamicVariables: z.record(z.string(), z.string()).nullable().optional(),
  lastModificationTimestamp: z.number().describe('Last modification, Unix milliseconds')
});
let mapLlm = (llm: Record<string, any>) => ({
  llmId: llm.llm_id,
  version: llm.version,
  isPublished: llm.is_published,
  generalPrompt: llm.general_prompt,
  beginMessage: llm.begin_message,
  model: llm.model,
  knowledgeBaseIds: llm.knowledge_base_ids,
  generalTools: llm.general_tools,
  modelTemperature: llm.model_temperature,
  defaultDynamicVariables: llm.default_dynamic_variables,
  lastModificationTimestamp: llm.last_modification_timestamp
});
let settingsSchema = z.object(settings);
let bodyFor = (input: z.infer<typeof settingsSchema>) => ({
  ...input.additionalSettings,
  ...pickDefined({
    general_prompt: input.generalPrompt,
    begin_message: input.beginMessage,
    model: input.model,
    model_temperature: input.modelTemperature,
    knowledge_base_ids: input.knowledgeBaseIds,
    default_dynamic_variables: input.defaultDynamicVariables,
    general_tools: input.generalTools
  })
});

export let createRetellLlm = SlateTool.create(spec, {
  name: 'Create Retell LLM',
  key: 'create_retell_llm',
  description:
    'Create a prompt-based Retell response engine. Pass its llmId to create_agent with responseEngine type retell-llm.'
})
  .input(z.object(settings))
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let llm = await new RetellClient(ctx.auth.token).createLlm(bodyFor(ctx.input));
    return { output: mapLlm(llm), message: `Created response engine **${llm.llm_id}**.` };
  })
  .build();

export let getRetellLlm = SlateTool.create(spec, {
  name: 'Get Retell LLM',
  key: 'get_retell_llm',
  description:
    'Read a response engine and its prompt, model, and knowledge-base configuration.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      llmId: z.string().min(1).describe('ID from list_retell_llms'),
      version: z.number().int().min(0).optional().describe('Version; omit for latest')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let llm = await new RetellClient(ctx.auth.token).getLlm(
      ctx.input.llmId,
      ctx.input.version
    );
    return { output: mapLlm(llm), message: `Retrieved response engine **${llm.llm_id}**.` };
  })
  .build();

export let listRetellLlms = SlateTool.create(spec, {
  name: 'List Retell LLMs',
  key: 'list_retell_llms',
  description:
    'Discover prompt-based response engines and their IDs for create_agent or update_agent. Supports cursor pagination.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().int().min(1).max(1000).optional(),
      paginationKey: z.string().optional().describe('Cursor from the previous response'),
      sortOrder: z.enum(['ascending', 'descending']).optional()
    })
  )
  .output(
    z.object({
      llms: z.array(outputSchema),
      hasMore: z.boolean(),
      paginationKey: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let page = await new RetellClient(ctx.auth.token).listLlms(ctx.input);
    return {
      output: {
        llms: page.items.map(mapLlm),
        hasMore: page.has_more,
        paginationKey: page.pagination_key
      },
      message: `Found **${page.items.length}** response engine(s).`
    };
  })
  .build();

export let updateRetellLlm = SlateTool.create(spec, {
  name: 'Update Retell LLM',
  key: 'update_retell_llm',
  description:
    'Update the latest draft or an explicitly selected response-engine version. Only supplied settings are changed.'
})
  .input(
    z.object({
      llmId: z.string().min(1).describe('ID from list_retell_llms'),
      version: z.number().int().min(0).optional(),
      ...settings
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let body = bodyFor(ctx.input);
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one response engine setting to update.');
    let llm = await new RetellClient(ctx.auth.token).updateLlm(
      ctx.input.llmId,
      body,
      ctx.input.version
    );
    return { output: mapLlm(llm), message: `Updated response engine **${llm.llm_id}**.` };
  })
  .build();

export let deleteRetellLlm = SlateTool.create(spec, {
  name: 'Delete Retell LLM',
  key: 'delete_retell_llm',
  description:
    'Delete an unused response engine. Delete or detach agents that reference it first; Retell rejects deletion while it is in use.',
  tags: { destructive: true }
})
  .input(z.object({ llmId: z.string().min(1).describe('ID from list_retell_llms') }))
  .output(z.object({ success: z.boolean(), llmId: z.string() }))
  .handleInvocation(async ctx => {
    await new RetellClient(ctx.auth.token).deleteLlm(ctx.input.llmId);
    return {
      output: { success: true, llmId: ctx.input.llmId },
      message: `Deleted response engine **${ctx.input.llmId}**.`
    };
  })
  .build();
