import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, connectionApiBaseUrl, organization } from '../lib/client';
import { organizationInput } from '../lib/schemas';
import { spec } from '../spec';

export let getStack = SlateTool.create(spec, {
  name: 'Get Stack',
  key: 'get_stack',
  description: `Retrieve a Pulumi stack's tags, current operation and version, with optional recorded outputs. Secret outputs remain in the provider's encrypted representation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organization: organizationInput,
      projectName: z.string().describe('Project name'),
      stackName: z.string().describe('Stack name'),
      includeOutputs: z
        .boolean()
        .optional()
        .describe('Fetch recorded outputs through the outputs API; secrets remain encrypted')
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
      baseUrl: connectionApiBaseUrl(ctx.auth, ctx.config)
    });

    let org = organization(ctx.input.organization, ctx.config.organization);

    let stackInfo = await client.getStack(org, ctx.input.projectName, ctx.input.stackName);

    let outputs: Record<string, unknown> | undefined;
    if (ctx.input.includeOutputs) {
      outputs = (await client.getStackOutputs(org, ctx.input.projectName, ctx.input.stackName))
        .outputs;
    }

    return {
      output: {
        organizationName: stackInfo.orgName,
        projectName: stackInfo.projectName,
        stackName: stackInfo.stackName,
        version: stackInfo.version,
        tags: stackInfo.tags,
        currentOperation: stackInfo.currentOperation ?? undefined,
        outputs
      },
      message: `Stack **${org}/${ctx.input.projectName}/${ctx.input.stackName}** (v${stackInfo.version})${stackInfo.currentOperation ? ` — currently running **${stackInfo.currentOperation.kind}**` : ''}${outputs ? ` with ${Object.keys(outputs).length} output(s)` : ''}`
    };
  })
  .build();
