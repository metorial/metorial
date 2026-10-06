import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, connectionApiBaseUrl, organization } from '../lib/client';
import { organizationInput } from '../lib/schemas';
import { spec } from '../spec';

export let openEnvironment = SlateTool.create(spec, {
  name: 'Open Environment',
  key: 'open_environment',
  description: `Open a Pulumi ESC environment to resolve and retrieve its computed values and secrets. This evaluates all dynamic providers (like AWS login, etc.) and returns the resolved values. Optionally retrieve a specific property path.`,
  instructions: [
    'Opening an environment creates a session that resolves all dynamic values and secrets.',
    'Use the property parameter to fetch a specific nested value instead of the entire resolved environment.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      organization: organizationInput,
      projectName: z.string().describe('ESC project name'),
      environmentName: z.string().describe('Environment name'),
      duration: z.string().optional().describe('Session duration (e.g., "1h", "2h45m")'),
      property: z
        .string()
        .optional()
        .describe(
          'Specific property path to retrieve (e.g., "environmentVariables.AWS_ACCESS_KEY_ID")'
        )
    })
  )
  .output(
    z.object({
      sessionId: z.string().optional(),
      resolvedValues: z.any()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: connectionApiBaseUrl(ctx.auth, ctx.config)
    });

    let org = organization(ctx.input.organization, ctx.config.organization);

    let session = await client.openEnvironment(
      org,
      ctx.input.projectName,
      ctx.input.environmentName,
      ctx.input.duration
    );
    let sessionId = session.id;

    let resolvedValues = await client.readOpenEnvironment(
      org,
      ctx.input.projectName,
      ctx.input.environmentName,
      sessionId,
      ctx.input.property
    );

    return {
      output: {
        sessionId,
        resolvedValues
      },
      message: `Opened environment **${org}/${ctx.input.projectName}/${ctx.input.environmentName}**${ctx.input.property ? ` (property: ${ctx.input.property})` : ''} — session ID: ${sessionId}`
    };
  })
  .build();
