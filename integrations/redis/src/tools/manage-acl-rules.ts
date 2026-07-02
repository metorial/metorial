import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

let aclRuleSchema = z.object({
  ruleId: z.number().describe('ACL rule ID'),
  name: z.string().describe('Rule name'),
  acl: z
    .string()
    .optional()
    .describe('Redis ACL string defining permitted commands and key patterns'),
  isDefault: z.boolean().optional().describe('Whether this is a predefined default rule')
});

export let listAclRules = SlateTool.create(spec, {
  name: 'List ACL Rules',
  key: 'list_acl_rules',
  description: `List all Redis ACL rules in the account. ACL rules define permitted commands, key patterns, and pub/sub channels for fine-grained database access control.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      rules: z.array(aclRuleSchema).describe('List of ACL rules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let data = await client.listAclRules();
    let rawRules = data?.redisRules || data || [];
    if (!Array.isArray(rawRules)) rawRules = [];

    let rules = rawRules.map((r: any) => ({
      ruleId: r.id,
      name: r.name,
      acl: r.acl,
      isDefault: r.isDefault
    }));

    return {
      output: { rules },
      message: `Found **${rules.length}** ACL rule(s).`
    };
  })
  .build();

export let createAclRule = SlateTool.create(spec, {
  name: 'Create ACL Rule',
  key: 'create_acl_rule',
  description: `Create a new Redis ACL rule defining permitted commands and key patterns for database access control.`
})
  .input(
    z.object({
      name: z.string().describe('Rule name'),
      acl: z
        .string()
        .describe(
          'Redis ACL string (e.g., "+@read ~key:*" for read-only access to keys matching key:*)'
        )
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID to track the creation'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let result = await client.createAclRule({
      name: ctx.input.name,
      acl: ctx.input.acl
    });

    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: `ACL rule **${ctx.input.name}** creation initiated. Task ID: **${taskId}**.`
    };
  })
  .build();

export let updateAclRule = SlateTool.create(spec, {
  name: 'Update ACL Rule',
  key: 'update_acl_rule',
  description: `Update an existing Redis ACL rule. Modify the rule's ACL string to change permitted commands and key patterns.`
})
  .input(
    z.object({
      ruleId: z.number().describe('ACL rule ID to update'),
      acl: z.string().describe('Updated Redis ACL string')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID to track the update'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let result = await client.updateAclRule(ctx.input.ruleId, {
      acl: ctx.input.acl
    });

    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: `ACL rule **${ctx.input.ruleId}** update initiated. Task ID: **${taskId}**.`
    };
  })
  .build();

export let deleteAclRule = SlateTool.create(spec, {
  name: 'Delete ACL Rule',
  key: 'delete_acl_rule',
  description: `Delete a Redis ACL rule by ID. Predefined default rules cannot be deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      ruleId: z.number().describe('ACL rule ID to delete')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID to track the deletion'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let result = await client.deleteAclRule(ctx.input.ruleId);
    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: `ACL rule **${ctx.input.ruleId}** deletion initiated. Task ID: **${taskId}**.`
    };
  })
  .build();
