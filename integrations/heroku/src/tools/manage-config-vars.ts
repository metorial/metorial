import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageConfigVars = SlateTool.create(spec, {
  name: 'Manage Config Vars',
  key: 'manage_config_vars',
  description: `Read or update environment configuration variables for a Heroku app. Config vars are used to store credentials, API keys, database URLs, and other environment-specific settings.
Requires **read-protected** or **write-protected** OAuth scopes.`,
  instructions: [
    'To read config vars, omit the "updates" field.',
    'To set variables, pass key-value pairs in "updates".',
    'To remove a variable, set its value to null in "updates".'
  ],
  constraints: ['Requires read-protected or write-protected OAuth scope.']
})
  .input(
    z.object({
      appIdOrName: z.string().describe('App name or unique identifier'),
      updates: z
        .record(z.string(), z.string().nullable())
        .optional()
        .describe('Key-value pairs to set. Set a value to null to remove the variable.')
    })
  )
  .output(
    z.object({
      configVars: z
        .record(z.string(), z.string())
        .describe('All current config vars for the app after any updates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { appIdOrName, updates } = ctx.input;

    if (updates && Object.keys(updates).length > 0) {
      let vars = await client.updateConfigVars(appIdOrName, updates);
      let setKeys = Object.entries(updates)
        .filter(([_, v]) => v !== null)
        .map(([k]) => k);
      let removedKeys = Object.entries(updates)
        .filter(([_, v]) => v === null)
        .map(([k]) => k);
      let parts: string[] = [];
      if (setKeys.length > 0) parts.push(`set ${setKeys.length} var(s)`);
      if (removedKeys.length > 0) parts.push(`removed ${removedKeys.length} var(s)`);
      return {
        output: { configVars: vars },
        message: `Updated config vars for **${appIdOrName}**: ${parts.join(', ')}.`
      };
    }

    let vars = await client.getConfigVars(appIdOrName);
    return {
      output: { configVars: vars },
      message: `Retrieved **${Object.keys(vars).length}** config var(s) for app **${appIdOrName}**.`
    };
  })
  .build();
