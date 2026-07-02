import { SlateTool } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let executeScript = SlateTool.create(spec, {
  name: 'Execute Groovy Script',
  key: 'execute_script',
  description: `Execute a Groovy script on the Jenkins master or on a specific node. Returns the script output. Useful for advanced administration tasks, diagnostics, and custom automation.`,
  constraints: [
    'Requires admin-level permissions on the Jenkins instance.',
    'Scripts execute with full Jenkins system access — use with caution.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      script: z.string().describe('Groovy script to execute'),
      nodeName: z
        .string()
        .optional()
        .describe('Name of the node to run the script on. Omit to run on the Jenkins master.')
    })
  )
  .output(
    z.object({
      scriptOutput: z.string().describe('Output from the script execution')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JenkinsClient({
      instanceUrl: ctx.config.instanceUrl,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let output = await client.executeScript(ctx.input.script, ctx.input.nodeName);

    return {
      output: { scriptOutput: output },
      message: `Script executed${ctx.input.nodeName ? ` on node \`${ctx.input.nodeName}\`` : ' on master'}. Output:\n\`\`\`\n${output.substring(0, 500)}${output.length > 500 ? '...' : ''}\n\`\`\``
    };
  })
  .build();
