import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let configureAnalysisTool = SlateTool.create(spec, {
  name: 'Configure Analysis Tool',
  key: 'configure_analysis_tool',
  description: `Enable, disable, or configure a static analysis tool for a repository. Can toggle the tool on/off and set whether it should use a configuration file from the repository. Use the "List Repository Tools" tool first to find tool UUIDs.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      repositoryName: z.string().describe('Name of the repository.'),
      toolUuid: z.string().describe('UUID of the analysis tool to configure.'),
      isEnabled: z.boolean().optional().describe('Whether to enable or disable the tool.'),
      usesConfigurationFile: z
        .boolean()
        .optional()
        .describe('Whether the tool should use a configuration file from the repository.')
    })
  )
  .output(
    z.object({
      toolUuid: z.string().describe('UUID of the configured tool.'),
      configured: z.boolean().describe('Whether the configuration was applied.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: any = {};
    if (ctx.input.isEnabled !== undefined) body.isEnabled = ctx.input.isEnabled;
    if (ctx.input.usesConfigurationFile !== undefined)
      body.usesConfigurationFile = ctx.input.usesConfigurationFile;

    await client.configureAnalysisTool(ctx.input.repositoryName, ctx.input.toolUuid, body);

    let action =
      ctx.input.isEnabled === true
        ? 'enabled'
        : ctx.input.isEnabled === false
          ? 'disabled'
          : 'configured';

    return {
      output: {
        toolUuid: ctx.input.toolUuid,
        configured: true
      },
      message: `Tool **${ctx.input.toolUuid}** has been ${action} for **${ctx.input.repositoryName}**.`
    };
  })
  .build();
