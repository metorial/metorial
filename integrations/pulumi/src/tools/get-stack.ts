import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getStack = SlateTool.create(spec, {
  name: 'Get Stack',
  key: 'get_stack',
  description: `Retrieve detailed information about a specific Pulumi stack including its tags, current operation status, version, and optionally its outputs and resource details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organization: z
        .string()
        .optional()
        .describe('Organization name (uses default from config if not set)'),
      projectName: z.string().describe('Project name'),
      stackName: z.string().describe('Stack name'),
      includeOutputs: z
        .boolean()
        .optional()
        .describe('If true, also fetch stack outputs from the exported state')
    })
  )
  .output(
    z.object({
      organizationName: z.string(),
      projectName: z.string(),
      stackName: z.string(),
      version: z.number().optional(),
      tags: z.record(z.string(), z.string()).optional(),
      currentOperation: z
        .object({
          kind: z.string().optional(),
          author: z.string().optional(),
          started: z.number().optional()
        })
        .optional(),
      outputs: z.record(z.string(), z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let org = ctx.input.organization || ctx.config.organization;
    if (!org)
      throw new Error('Organization is required. Set it in config or provide it as input.');

    let stackInfo = await client.getStack(org, ctx.input.projectName, ctx.input.stackName);

    let outputs: Record<string, any> | undefined;
    if (ctx.input.includeOutputs) {
      try {
        let exportData = await client.getStackExport(
          org,
          ctx.input.projectName,
          ctx.input.stackName
        );
        let resources = exportData?.deployment?.resources || [];
        let stackResource = resources.find((r: any) => r.type === 'pulumi:pulumi:Stack');
        if (stackResource?.outputs) {
          outputs = stackResource.outputs;
        }
      } catch (_e) {
        ctx.warn('Failed to fetch stack outputs');
      }
    }

    return {
      output: {
        organizationName: stackInfo.orgName,
        projectName: stackInfo.projectName,
        stackName: stackInfo.stackName,
        version: stackInfo.version,
        tags: stackInfo.tags,
        currentOperation: stackInfo.currentOperation,
        outputs
      },
      message: `Stack **${org}/${ctx.input.projectName}/${ctx.input.stackName}** (v${stackInfo.version || 0})${stackInfo.currentOperation ? ` — currently running **${stackInfo.currentOperation.kind}**` : ''}${outputs ? ` with ${Object.keys(outputs).length} output(s)` : ''}`
    };
  })
  .build();
