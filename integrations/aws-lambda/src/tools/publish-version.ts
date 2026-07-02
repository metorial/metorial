import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let publishVersion = SlateTool.create(spec, {
  name: 'Publish Version',
  key: 'publish_version',
  description: `Publish an immutable version from the current \`$LATEST\` code and configuration. Optionally list all published versions of a function by setting **listOnly** to true.`,
  instructions: [
    'Use codeSha256 to ensure you are publishing the expected code revision.',
    'Published versions are immutable and can be referenced by aliases.'
  ]
})
  .input(
    z.object({
      functionName: z.string().describe('Function name or ARN'),
      listOnly: z
        .boolean()
        .optional()
        .describe('Set to true to only list versions without publishing'),
      description: z.string().optional().describe('Version description'),
      codeSha256: z
        .string()
        .optional()
        .describe('Expected SHA256 hash of the code to publish (validation)')
    })
  )
  .output(
    z.object({
      version: z.string().optional().describe('Published version number'),
      functionArn: z.string().optional().describe('Version-specific ARN'),
      description: z.string().optional().describe('Version description'),
      codeSha256: z.string().optional().describe('SHA256 of the published code'),
      versions: z
        .array(
          z.object({
            version: z.string().optional(),
            functionArn: z.string().optional(),
            description: z.string().optional(),
            lastModified: z.string().optional(),
            runtime: z.string().optional()
          })
        )
        .optional()
        .describe('List of versions (when listOnly is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    if (ctx.input.listOnly) {
      let result = await client.listVersionsByFunction(ctx.input.functionName);
      let versions = (result.Versions || []).map((v: any) => ({
        version: v.Version,
        functionArn: v.FunctionArn,
        description: v.Description,
        lastModified: v.LastModified,
        runtime: v.Runtime
      }));
      return {
        output: { versions },
        message: `Found **${versions.length}** version(s) for **${ctx.input.functionName}**.`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.description) params.Description = ctx.input.description;
    if (ctx.input.codeSha256) params.CodeSha256 = ctx.input.codeSha256;

    let result = await client.publishVersion(ctx.input.functionName, params);

    return {
      output: {
        version: result.Version,
        functionArn: result.FunctionArn,
        description: result.Description,
        codeSha256: result.CodeSha256
      },
      message: `Published version **${result.Version}** for **${ctx.input.functionName}**.`
    };
  })
  .build();
