import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordServiceError } from '../lib/errors';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let actionSchema = z
  .object({
    type: z
      .number()
      .describe('The action type: 1 = BLOCK_MESSAGE, 2 = SEND_ALERT_MESSAGE, 3 = TIMEOUT'),
    metadata: z
      .record(z.string(), z.any())
      .optional()
      .describe(
        'Additional metadata for the action. For SEND_ALERT_MESSAGE: { channel_id }. For TIMEOUT: { duration_seconds }.'
      )
  })
  .describe('Auto moderation action object');

let triggerMetadataSchema = z
  .object({
    keyword_filter: z
      .array(z.string())
      .optional()
      .describe('Array of keyword strings to match (for KEYWORD trigger type)'),
    regex_patterns: z
      .array(z.string())
      .optional()
      .describe('Array of regex patterns to match (for KEYWORD trigger type, max 10)'),
    presets: z
      .array(z.number())
      .optional()
      .describe(
        'Array of preset keyword list types: 1 = PROFANITY, 2 = SEXUAL_CONTENT, 3 = SLURS (for KEYWORD_PRESET trigger type)'
      ),
    allow_list: z
      .array(z.string())
      .optional()
      .describe('Array of strings that should not trigger the rule'),
    mention_total_limit: z
      .number()
      .optional()
      .describe(
        'Total number of unique role and user mentions allowed per message (for MENTION_SPAM trigger type)'
      ),
    mention_raid_protection_enabled: z
      .boolean()
      .optional()
      .describe('Whether to automatically detect mention raids')
  })
  .describe('Trigger metadata object');

let ruleOutputSchema = z.object({
  ruleId: z.string().describe('The auto moderation rule ID'),
  guildId: z.string().describe('The guild ID this rule belongs to'),
  name: z.string().describe('The name of the rule'),
  eventType: z.number().describe('The event type: 1 = MESSAGE_SEND'),
  triggerType: z
    .number()
    .describe('The trigger type: 1 = KEYWORD, 3 = SPAM, 4 = KEYWORD_PRESET, 5 = MENTION_SPAM'),
  enabled: z.boolean().describe('Whether the rule is currently enabled'),
  actions: z.array(z.any()).describe('The actions to execute when the rule is triggered'),
  triggerMetadata: z.any().describe('The trigger metadata associated with this rule')
});

let formatRule = (rule: any) => ({
  ruleId: rule.id,
  guildId: rule.guild_id,
  name: rule.name ?? '',
  eventType: rule.event_type,
  triggerType: rule.trigger_type,
  enabled: rule.enabled ?? false,
  actions: rule.actions ?? [],
  triggerMetadata: rule.trigger_metadata ?? {}
});

export let manageAutoModerationTool = SlateTool.create(spec, {
  name: 'Manage Auto Moderation',
  key: 'manage_auto_moderation',
  description: `Manage auto moderation rules in a Discord guild. Supports listing all rules, getting a specific rule, creating new rules, updating existing rules, and deleting rules.`,
  instructions: [
    'Use action "list" to fetch all auto moderation rules for a guild.',
    'Use action "get" to retrieve a specific auto moderation rule by its ID.',
    'Use action "create" to create a new auto moderation rule. Requires name, eventType, triggerType, and actions.',
    'Use action "update" to modify an existing auto moderation rule. Provide only the fields you want to change.',
    'Use action "delete" to remove an auto moderation rule from the guild.',
    'Trigger types: 1 = KEYWORD (match keywords), 3 = SPAM (detect spam), 4 = KEYWORD_PRESET (use preset lists), 5 = MENTION_SPAM (mention limits).',
    'Action types: 1 = BLOCK_MESSAGE, 2 = SEND_ALERT_MESSAGE (requires channel_id in metadata), 3 = TIMEOUT (requires duration_seconds in metadata).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(discordActionScopes.manageAutoModeration)
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The auto moderation action to perform'),
      guildId: z.string().describe('The guild ID to operate in'),
      ruleId: z
        .string()
        .optional()
        .describe('The auto moderation rule ID (required for get, update, delete)'),
      name: z.string().optional().describe('The name of the rule (required for create)'),
      eventType: z
        .number()
        .optional()
        .describe('The event type: 1 = MESSAGE_SEND (required for create)'),
      triggerType: z
        .number()
        .optional()
        .describe(
          'The trigger type: 1 = KEYWORD, 3 = SPAM, 4 = KEYWORD_PRESET, 5 = MENTION_SPAM (required for create)'
        ),
      triggerMetadata: triggerMetadataSchema
        .optional()
        .describe('Trigger-specific metadata (depends on trigger type)'),
      actions: z
        .array(actionSchema)
        .optional()
        .describe(
          'Array of actions to execute when the rule is triggered (required for create)'
        ),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the rule is enabled (defaults to false)'),
      exemptRoles: z
        .array(z.string())
        .optional()
        .describe('Array of role IDs that are exempt from this rule (max 20)'),
      exemptChannels: z
        .array(z.string())
        .optional()
        .describe('Array of channel IDs that are exempt from this rule (max 50)')
    })
  )
  .output(
    z.object({
      rule: ruleOutputSchema
        .optional()
        .describe('The auto moderation rule (for get, create, update actions)'),
      rules: z
        .array(ruleOutputSchema)
        .optional()
        .describe('Array of auto moderation rules (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input as any;
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });
    let { action, guildId, ruleId } = input;

    if (action === 'list') {
      let rawRules = await client.listAutoModerationRules(guildId);
      let rules = rawRules.map((rule: any) => formatRule(rule));
      return {
        output: { rules },
        message: `Retrieved ${rules.length} auto moderation rule(s) from guild \`${guildId}\`.`
      };
    }

    if (action === 'get') {
      if (!ruleId) throw discordServiceError('ruleId is required for get action');
      let raw = await client.getAutoModerationRule(guildId, ruleId);
      let rule = formatRule(raw);
      return {
        output: { rule },
        message: `Retrieved auto moderation rule \`${ruleId}\` from guild \`${guildId}\`.`
      };
    }

    if (action === 'create') {
      if (!input.name) throw discordServiceError('name is required for create action');
      if (input.eventType === undefined)
        throw discordServiceError('eventType is required for create action');
      if (input.triggerType === undefined)
        throw discordServiceError('triggerType is required for create action');
      if (!input.actions) throw discordServiceError('actions is required for create action');

      let data: Record<string, any> = {
        name: input.name,
        event_type: input.eventType,
        trigger_type: input.triggerType,
        actions: input.actions
      };

      if (input.triggerMetadata) {
        data.trigger_metadata = input.triggerMetadata;
      }

      if (input.enabled !== undefined) {
        data.enabled = input.enabled;
      }

      if (input.exemptRoles) {
        data.exempt_roles = input.exemptRoles;
      }

      if (input.exemptChannels) {
        data.exempt_channels = input.exemptChannels;
      }

      let raw = await client.createAutoModerationRule(guildId, data);
      let rule = formatRule(raw);
      return {
        output: { rule },
        message: `Created auto moderation rule \`${rule.name}\` in guild \`${guildId}\`.`
      };
    }

    if (action === 'update') {
      if (!ruleId) throw discordServiceError('ruleId is required for update action');

      let data: Record<string, any> = {};

      if (input.name !== undefined) {
        data.name = input.name;
      }

      if (input.eventType !== undefined) {
        data.event_type = input.eventType;
      }

      if (input.triggerMetadata !== undefined) {
        data.trigger_metadata = input.triggerMetadata;
      }

      if (input.actions !== undefined) {
        data.actions = input.actions;
      }

      if (input.enabled !== undefined) {
        data.enabled = input.enabled;
      }

      if (input.exemptRoles !== undefined) {
        data.exempt_roles = input.exemptRoles;
      }

      if (input.exemptChannels !== undefined) {
        data.exempt_channels = input.exemptChannels;
      }

      let raw = await client.modifyAutoModerationRule(guildId, ruleId, data);
      let rule = formatRule(raw);
      return {
        output: { rule },
        message: `Updated auto moderation rule \`${ruleId}\` in guild \`${guildId}\`.`
      };
    }

    // delete
    if (!ruleId) throw discordServiceError('ruleId is required for delete action');
    await client.deleteAutoModerationRule(guildId, ruleId);
    return {
      output: {},
      message: `Deleted auto moderation rule \`${ruleId}\` from guild \`${guildId}\`.`
    };
  })
  .build();
