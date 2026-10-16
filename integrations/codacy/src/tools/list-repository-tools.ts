import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireCodacyString } from '../lib/helpers';
import { spec } from '../spec';

export let listRepositoryTools = SlateTool.create(spec, {
  name: 'List Repository Tools',
  key: 'list_repository_tools',
  description: `List the static analysis tools configured for a repository, including their enabled/disabled status. Shows which analysis tools (e.g. ESLint, PMD, Pylint) are active and whether they use configuration files from the repository.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      repositoryName: z.string().describe('Name of the repository.')
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .optional()
        .describe('Original Codacy response, including provider metadata.'),
      tools: z
        .array(
          z.object({
            toolUuid: z.string().describe('Unique tool identifier.'),
            toolName: z.string().optional().describe('Name of the analysis tool.'),
            isEnabled: z.boolean().optional().describe('Whether the tool is enabled.'),
            usesConfigurationFile: z
              .boolean()
              .optional()
              .describe('Whether the tool uses a config file from the repo.'),
            languages: z
              .array(z.string())
              .optional()
              .describe('Languages supported by this tool.')
          })
        )
        .describe('List of tools configured for the repository.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let response = await client.listRepositoryTools(ctx.input.repositoryName);

    let tools = (response.data ?? []).map((tool: any) => ({
      toolUuid: requireCodacyString(tool.uuid ?? tool.toolUuid, 'tool.uuid'),
      toolName: tool.name ?? tool.toolName ?? undefined,
      isEnabled: tool.settings?.isEnabled ?? tool.isEnabled ?? undefined,
      usesConfigurationFile:
        tool.settings?.usesConfigurationFile ?? tool.usesConfigurationFile ?? undefined,
      languages: tool.languages ?? undefined
    }));

    let enabledCount = tools.filter((t: any) => t.isEnabled).length;

    return {
      output: {
        raw: response,
        tools
      },
      message: `**${tools.length}** tool(s) configured for **${ctx.input.repositoryName}** (${enabledCount} enabled).`
    };
  })
  .build();
