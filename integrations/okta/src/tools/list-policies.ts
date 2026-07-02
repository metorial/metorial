import { SlateTool } from 'slates';
import { z } from 'zod';
import { OktaClient } from '../lib/client';
import { spec } from '../spec';

let policySchema = z.object({
  policyId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.string().describe('Policy type'),
  status: z.string().describe('ACTIVE or INACTIVE'),
  priority: z.number(),
  isSystem: z.boolean().describe('Whether this is a system-default policy'),
  created: z.string(),
  lastUpdated: z.string()
});

export let listPoliciesTool = SlateTool.create(spec, {
  name: 'List Policies',
  key: 'list_policies',
  description: `List policies of a given type in your Okta organization. Returns sign-on, password, MFA enrollment, or access policies depending on the specified type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      policyType: z
        .enum([
          'OKTA_SIGN_ON',
          'PASSWORD',
          'MFA_ENROLL',
          'OAUTH_AUTHORIZATION_POLICY',
          'IDP_DISCOVERY',
          'ACCESS_POLICY',
          'PROFILE_ENROLLMENT'
        ])
        .describe('Type of policy to list')
    })
  )
  .output(
    z.object({
      policies: z.array(policySchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new OktaClient({
      domain: ctx.config.domain,
      token: ctx.auth.token
    });

    let policies = await client.listPolicies(ctx.input.policyType);

    let result = policies.map(p => ({
      policyId: p.id,
      name: p.name,
      description: p.description,
      type: p.type,
      status: p.status,
      priority: p.priority,
      isSystem: p.system,
      created: p.created,
      lastUpdated: p.lastUpdated
    }));

    return {
      output: { policies: result },
      message: `Found **${result.length}** ${ctx.input.policyType} policies.`
    };
  })
  .build();
