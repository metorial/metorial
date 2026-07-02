import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let scriptSchema = z.object({
  scriptId: z.string().describe('Worker script identifier'),
  compatibilityDate: z.string().optional().describe('Compatibility date for the Worker'),
  compatibilityFlags: z.array(z.string()).optional().describe('Compatibility flags enabled'),
  createdOn: z.string().optional().describe('ISO 8601 timestamp when the script was created'),
  modifiedOn: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp when the script was last modified'),
  handlers: z
    .array(z.string())
    .optional()
    .describe('Event handlers defined (e.g. fetch, scheduled)'),
  hasModules: z.boolean().optional().describe('Whether the script uses ES modules format'),
  lastDeployedFrom: z
    .string()
    .optional()
    .describe('Source of last deployment (e.g. wrangler, api, dashboard)'),
  usageModel: z.string().optional().describe('Usage model (e.g. bundled, unbound)'),
  logpush: z.boolean().optional().describe('Whether Logpush is enabled'),
  placementMode: z.string().optional().describe('Smart placement mode')
});

export let listScripts = SlateTool.create(spec, {
  name: 'List Workers',
  key: 'list_scripts',
  description: `List all Worker scripts in the account. Returns metadata for each script including handlers, compatibility settings, and deployment info.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      scripts: z.array(scriptSchema).describe('List of Worker scripts')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let scripts = await client.listScripts();

    let mapped = (scripts || []).map((s: any) => ({
      scriptId: s.id,
      compatibilityDate: s.compatibility_date,
      compatibilityFlags: s.compatibility_flags,
      createdOn: s.created_on,
      modifiedOn: s.modified_on,
      handlers: s.handlers,
      hasModules: s.has_modules,
      lastDeployedFrom: s.last_deployed_from,
      usageModel: s.usage_model,
      logpush: s.logpush,
      placementMode: s.placement_mode
    }));

    return {
      output: { scripts: mapped },
      message: `Found **${mapped.length}** Worker script(s) in the account.`
    };
  })
  .build();
