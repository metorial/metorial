import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let policySchema = z.object({
  policyId: z.string().describe('Unique ID of the policy'),
  policyType: z
    .number()
    .describe(
      'Policy type: 0=TwoFactorAuthentication, 1=MasterPassword, 2=PasswordGenerator, 3=SingleOrg, 4=RequireSso, 5=OrgDataOwnership, 6=DisableSend, 7=SendOptions, 8=ResetPassword, 9=MaxVaultTimeout, 10=DisablePersonalVaultExport'
    ),
  enabled: z.boolean().describe('Whether the policy is currently enabled'),
  configuration: z
    .record(z.string(), z.any())
    .nullable()
    .describe('Policy-specific configuration data')
});

export let listPolicies = SlateTool.create(spec, {
  name: 'List Policies',
  key: 'list_policies',
  description: `List all organization policies and their current state. Policies control organization-wide behaviors such as requiring two-step login, enforcing master password strength, and restricting vault exports.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      policies: z.array(policySchema).describe('List of organization policies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let policies = await client.listPolicies();

    let mapped = policies.map(p => ({
      policyId: p.id,
      policyType: p.type,
      enabled: p.enabled,
      configuration: p.data
    }));

    return {
      output: { policies: mapped },
      message: `Found **${mapped.length}** policy/policies. **${mapped.filter(p => p.enabled).length}** enabled.`
    };
  })
  .build();
