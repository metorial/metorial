import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { NerdGraphClient } from '../lib/client';
import { spec } from '../spec';

let incidentPreferenceSchema = z
  .enum(['PER_POLICY', 'PER_CONDITION', 'PER_CONDITION_AND_TARGET'])
  .describe('How New Relic groups incidents opened by this policy');

let alertPolicySchema = z.object({
  policyId: z.string().describe('Alert policy ID'),
  name: z.string().optional().describe('Alert policy name'),
  incidentPreference: z.string().optional().describe('Incident grouping preference')
});

export let manageAlertPolicy = SlateTool.create(spec, {
  name: 'Manage Alert Policy',
  key: 'manage_alert_policy',
  description:
    'List, get, create, update, or delete New Relic alert policies. Policies group alert conditions and define how New Relic opens incidents.',
  instructions: [
    'To list: provide `action: "list"` and optionally `name`, `nameLike`, `policyIds`, or `cursor`.',
    'To get: provide `action: "get"` and `policyId`.',
    'To create: provide `action: "create"`, `name`, and optionally `incidentPreference`.',
    'To update: provide `action: "update"`, `policyId`, and the fields to change.',
    'To delete: provide `action: "delete"` and `policyId`.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      policyId: z
        .string()
        .optional()
        .describe('Alert policy ID for get/update/delete actions'),
      policyIds: z
        .array(z.string())
        .optional()
        .describe('Policy IDs to filter when action is list'),
      name: z
        .string()
        .optional()
        .describe('Policy name for create/update, or exact name filter for list'),
      nameLike: z
        .string()
        .optional()
        .describe('Case-insensitive partial name filter for list'),
      incidentPreference: incidentPreferenceSchema
        .optional()
        .describe('Incident grouping preference for create/update actions'),
      cursor: z.string().optional().describe('Pagination cursor for list action')
    })
  )
  .output(
    z.object({
      policy: alertPolicySchema.optional().describe('Single policy for get/create/update'),
      policies: z.array(alertPolicySchema).optional().describe('Policies returned by list'),
      totalCount: z.number().optional().describe('Total matching policy count'),
      nextCursor: z.string().optional().describe('Cursor for the next page'),
      deletedPolicyId: z.string().optional().describe('Deleted policy ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NerdGraphClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      accountId: ctx.config.accountId
    });

    if (ctx.input.action === 'list') {
      ctx.progress('Listing alert policies...');
      let result = await client.listAlertPolicies({
        cursor: ctx.input.cursor,
        ids: ctx.input.policyIds,
        name: ctx.input.name,
        nameLike: ctx.input.nameLike
      });
      let policies = (result?.policies || []).map((policy: any) => ({
        policyId: policy.id?.toString(),
        name: policy.name,
        incidentPreference: policy.incidentPreference
      }));

      return {
        output: {
          policies,
          totalCount: result?.totalCount,
          nextCursor: result?.nextCursor || undefined
        },
        message: `Found **${result?.totalCount ?? policies.length}** alert policy/policies. Returned **${policies.length}** in this page.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.policyId)
        throw createApiServiceError('policyId is required for get action');
      ctx.progress('Fetching alert policy...');
      let policy = await client.getAlertPolicy(ctx.input.policyId);

      if (!policy) {
        return {
          output: {},
          message: `No alert policy found with ID **${ctx.input.policyId}**.`
        };
      }

      return {
        output: {
          policy: {
            policyId: policy.id?.toString(),
            name: policy.name,
            incidentPreference: policy.incidentPreference
          }
        },
        message: `Alert policy **${policy.name}** retrieved successfully.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.policyId)
        throw createApiServiceError('policyId is required for delete action');
      ctx.progress('Deleting alert policy...');
      let result = await client.deleteAlertPolicy(ctx.input.policyId);
      let deletedPolicyId = result?.id?.toString() || ctx.input.policyId;

      return {
        output: { deletedPolicyId },
        message: `Alert policy **${deletedPolicyId}** deleted successfully.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw createApiServiceError('name is required for create action');
      ctx.progress('Creating alert policy...');
      let policy = await client.createAlertPolicy({
        name: ctx.input.name,
        incidentPreference: ctx.input.incidentPreference || 'PER_POLICY'
      });

      return {
        output: {
          policy: {
            policyId: policy?.id?.toString(),
            name: policy?.name,
            incidentPreference: policy?.incidentPreference
          }
        },
        message: `Alert policy **${policy?.name}** created successfully.`
      };
    }

    if (!ctx.input.policyId)
      throw createApiServiceError('policyId is required for update action');
    if (ctx.input.name === undefined && ctx.input.incidentPreference === undefined) {
      throw createApiServiceError('Provide name or incidentPreference for update action');
    }

    ctx.progress('Updating alert policy...');
    let policy = await client.updateAlertPolicy(ctx.input.policyId, {
      name: ctx.input.name,
      incidentPreference: ctx.input.incidentPreference
    });

    return {
      output: {
        policy: {
          policyId: policy?.id?.toString(),
          name: policy?.name,
          incidentPreference: policy?.incidentPreference
        }
      },
      message: `Alert policy **${policy?.name}** updated successfully.`
    };
  })
  .build();
