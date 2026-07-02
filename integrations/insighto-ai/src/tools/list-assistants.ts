import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAssistants = SlateTool.create(spec, {
  name: 'List Assistants',
  key: 'list_assistants',
  description: `Retrieve a paginated list of AI assistants. Optionally fetch details for a specific assistant by ID, including linked widgets and data sources.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      assistantId: z
        .string()
        .optional()
        .describe('Specific assistant ID to retrieve details for'),
      includeWidgets: z
        .boolean()
        .optional()
        .describe('Include linked widgets for the specified assistant'),
      includeDataSources: z
        .boolean()
        .optional()
        .describe('Include connected data sources for the specified assistant'),
      page: z.number().optional().describe('Page number (default 1)'),
      size: z.number().optional().describe('Items per page (default 50, max 100)')
    })
  )
  .output(
    z.object({
      assistants: z
        .array(
          z.object({
            assistantId: z.string(),
            name: z.string().optional(),
            description: z.string().optional(),
            assistantType: z.string().optional(),
            llmModel: z.string().optional(),
            systemPrompt: z.string().optional()
          })
        )
        .optional(),
      assistant: z
        .object({
          assistantId: z.string(),
          name: z.string().optional(),
          description: z.string().optional(),
          assistantType: z.string().optional(),
          llmModel: z.string().optional(),
          systemPrompt: z.string().optional(),
          widgets: z.array(z.any()).optional(),
          dataSources: z.array(z.any()).optional()
        })
        .optional(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.assistantId) {
      let result = await client.getAssistant(ctx.input.assistantId);
      let data = result.data || result;
      let widgets: any[] | undefined;
      let dataSources: any[] | undefined;

      if (ctx.input.includeWidgets) {
        let widgetResult = await client.getAssistantWidgets(ctx.input.assistantId);
        widgets = widgetResult.data || widgetResult;
      }
      if (ctx.input.includeDataSources) {
        let dsResult = await client.getAssistantDataSources(ctx.input.assistantId);
        dataSources = dsResult.data || dsResult;
      }

      return {
        output: {
          assistant: {
            assistantId: data.id,
            name: data.name,
            description: data.description,
            assistantType: data.assistant_type,
            llmModel: data.llm_model,
            systemPrompt: data.system_prompt,
            widgets,
            dataSources
          }
        },
        message: `Retrieved assistant **${data.name || data.id}**.`
      };
    }

    let result = await client.listAssistants({ page: ctx.input.page, size: ctx.input.size });
    let items = result.data || result.items || result;
    let list = Array.isArray(items) ? items : [];
    return {
      output: {
        assistants: list.map((a: any) => ({
          assistantId: a.id,
          name: a.name,
          description: a.description,
          assistantType: a.assistant_type,
          llmModel: a.llm_model,
          systemPrompt: a.system_prompt
        })),
        totalCount: result.total || list.length
      },
      message: `Found **${list.length}** assistant(s).`
    };
  })
  .build();
