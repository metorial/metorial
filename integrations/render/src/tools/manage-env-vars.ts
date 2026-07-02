import { SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let manageEnvVars = SlateTool.create(spec, {
  name: 'Manage Environment Variables',
  key: 'manage_env_vars',
  description: `List, set, or delete environment variables on a Render service. Use **list** to view all env vars, **set** to add/update one or more variables, or **delete** to remove a variable by key name.`
})
  .input(
    z.object({
      serviceId: z.string().describe('The service ID (e.g., srv-abc123)'),
      action: z.enum(['list', 'set', 'delete']).describe('Action to perform'),
      variables: z
        .array(
          z.object({
            key: z.string().describe('Environment variable name'),
            value: z
              .string()
              .optional()
              .describe('Environment variable value (required for set action)')
          })
        )
        .optional()
        .describe('Variables to set or delete. Required for set/delete actions.')
    })
  )
  .output(
    z.object({
      envVars: z
        .array(
          z.object({
            key: z.string().describe('Variable name'),
            value: z.string().optional().describe('Variable value')
          })
        )
        .optional()
        .describe('Current environment variables (for list action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let { serviceId, action, variables } = ctx.input;

    if (action === 'list') {
      let data = await client.listServiceEnvVars(serviceId);
      let envVars = (data as any[]).map((item: any) => ({
        key: item.envVar?.key || item.key,
        value: item.envVar?.value || item.value
      }));

      return {
        output: { envVars, success: true },
        message: `Found **${envVars.length}** environment variable(s) on service \`${serviceId}\`.${envVars.map(v => `\n- \`${v.key}\``).join('')}`
      };
    }

    if (action === 'set') {
      if (!variables || variables.length === 0)
        throw new Error('Variables are required for set action');
      let envVars = variables.map(v => ({ key: v.key, value: v.value || '' }));
      await client.updateServiceEnvVars(serviceId, envVars);

      return {
        output: { success: true },
        message: `Set **${variables.length}** environment variable(s) on service \`${serviceId}\`: ${variables.map(v => `\`${v.key}\``).join(', ')}.`
      };
    }

    if (action === 'delete') {
      if (!variables || variables.length === 0)
        throw new Error('Variables are required for delete action');
      for (let v of variables) {
        await client.deleteServiceEnvVar(serviceId, v.key);
      }

      return {
        output: { success: true },
        message: `Deleted **${variables.length}** environment variable(s) from service \`${serviceId}\`: ${variables.map(v => `\`${v.key}\``).join(', ')}.`
      };
    }

    return { output: { success: false }, message: 'Unknown action.' };
  })
  .build();
