import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listRuleTypes = SlateTool.create(spec, {
  name: 'List Rule Types',
  key: 'list_rule_types',
  description: `List Kibana alerting rule types available to the authenticated user. Use this before creating rules to discover ruleTypeId values, action groups, required license level, and authorized consumers.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      ruleTypes: z
        .array(
          z.object({
            ruleTypeId: z.string().describe('Rule type ID, such as ".es-query"'),
            name: z.string().describe('Human-readable rule type name'),
            actionGroups: z
              .array(
                z.object({
                  id: z.string(),
                  name: z.string()
                })
              )
              .optional()
              .describe('Action groups supported by this rule type'),
            defaultActionGroupId: z.string().optional().describe('Default action group ID'),
            recoveryActionGroup: z
              .object({
                id: z.string(),
                name: z.string()
              })
              .optional()
              .describe('Recovery action group for resolved alerts'),
            authorizedConsumers: z
              .record(z.string(), z.object({ read: z.boolean(), all: z.boolean() }))
              .optional()
              .describe('Consumers and privileges available for this rule type'),
            producer: z.string().optional().describe('Producer plugin or feature'),
            enabledInLicense: z
              .boolean()
              .optional()
              .describe('Whether the current license enables this rule type'),
            minimumLicenseRequired: z
              .string()
              .optional()
              .describe('Minimum Elastic license required')
          })
        )
        .describe('Alerting rule types available in Kibana')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let ruleTypes = await client.getRuleTypes();

    let mapped = ruleTypes.map((type: any) => ({
      ruleTypeId: type.id,
      name: type.name,
      actionGroups: type.action_groups,
      defaultActionGroupId: type.default_action_group_id,
      recoveryActionGroup: type.recovery_action_group,
      authorizedConsumers: type.authorized_consumers,
      producer: type.producer,
      enabledInLicense: type.enabled_in_license,
      minimumLicenseRequired: type.minimum_license_required
    }));

    return {
      output: { ruleTypes: mapped },
      message: `Found **${mapped.length}** alerting rule types.`
    };
  })
  .build();
