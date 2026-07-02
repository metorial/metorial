import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let policyChanges = SlateTrigger.create(spec, {
  name: 'Policy Changes',
  key: 'policy_changes',
  description:
    'Triggers when filtering policies are added or removed. Monitors the policy list for changes between polling intervals.'
})
  .input(
    z.object({
      eventType: z
        .enum(['added', 'removed'])
        .describe('Whether the policy was added or removed'),
      policyId: z.string().describe('Policy ID'),
      policyName: z.string().describe('Policy name'),
      policyData: z.record(z.string(), z.any()).describe('Full policy data')
    })
  )
  .output(
    z.object({
      policyId: z.string().describe('Policy ID'),
      policyName: z.string().describe('Policy name'),
      eventType: z.string().describe('Type of change'),
      policy: z.record(z.string(), z.any()).describe('Full policy data')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client(ctx.auth.token);
      let currentPolicies = await client.listPolicies();

      let currentPolicyIds = new Set(currentPolicies.map((p: any) => String(p.id)));
      let previousPolicyIds: Set<string> = new Set((ctx.state?.policyIds as string[]) ?? []);

      let inputs: Array<{
        eventType: 'added' | 'removed';
        policyId: string;
        policyName: string;
        policyData: Record<string, any>;
      }> = [];

      for (let policy of currentPolicies) {
        let policyId = String(policy.id);
        if (!previousPolicyIds.has(policyId)) {
          inputs.push({
            eventType: 'added',
            policyId,
            policyName: policy.name ?? '',
            policyData: policy
          });
        }
      }

      for (let prevId of previousPolicyIds) {
        if (!currentPolicyIds.has(prevId)) {
          inputs.push({
            eventType: 'removed',
            policyId: prevId,
            policyName: '',
            policyData: { id: prevId }
          });
        }
      }

      return {
        inputs,
        updatedState: {
          policyIds: Array.from(currentPolicyIds)
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: `policy.${ctx.input.eventType}`,
        id: `policy-${ctx.input.policyId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          policyId: ctx.input.policyId,
          policyName: ctx.input.policyName,
          eventType: ctx.input.eventType,
          policy: ctx.input.policyData
        }
      };
    }
  })
  .build();
