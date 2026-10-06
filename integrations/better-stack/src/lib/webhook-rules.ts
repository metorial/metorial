import { createApiServiceError } from 'slates';
import { z } from 'zod';

const ruleSchema = z.object({
  rule_target: z.enum(['query_string', 'header', 'body', 'json', 'xml']),
  match_type: z.enum([
    'contains',
    'contains_not',
    'matches_regex',
    'matches_regex_not',
    'equals',
    'equals_not'
  ]),
  target_field: z.string().optional(),
  content: z.string()
});
const rulesSchema = z.object({
  type: z.enum(['unused', 'all', 'any']),
  rules: z.array(ruleSchema)
});
export function webhookRuleBody(
  value: Record<string, unknown> | undefined,
  prefix: 'started' | 'acknowledged' | 'resolved'
) {
  if (value === undefined) return {};
  const single = ruleSchema.safeParse(value);
  const parsed = rulesSchema.safeParse(
    single.success ? { type: 'all', rules: [single.data] } : value
  );
  if (!parsed.success)
    throw createApiServiceError(
      'Webhook rules must be a provider rule, or { type: "unused" | "all" | "any", rules: [...] }. Each rule needs rule_target, match_type and content, with target_field where applicable.'
    );
  return { [`${prefix}_rule_type`]: parsed.data.type, [`${prefix}_rules`]: parsed.data.rules };
}
