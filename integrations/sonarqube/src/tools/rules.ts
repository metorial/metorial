import { z } from 'zod';
import { createClient, readOnlyTool } from './shared';

let ruleImpactSchema = z.object({
  softwareQuality: z
    .string()
    .describe('Software quality dimension (MAINTAINABILITY, RELIABILITY, SECURITY)'),
  severity: z.string().describe('Impact severity level')
});

let ruleDescriptionSectionSchema = z.object({
  content: z.string().describe('Section content in HTML format')
});

let optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);

let optionalRecord = (value: unknown) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

let mapImpacts = (value: unknown) =>
  Array.isArray(value)
    ? value.map(impact => {
        let record = optionalRecord(impact) ?? {};
        return {
          softwareQuality: String(record.softwareQuality ?? ''),
          severity: String(record.severity ?? '')
        };
      })
    : [];

let mapDescriptionSections = (value: unknown) =>
  Array.isArray(value)
    ? value.map(section => {
        let record = optionalRecord(section) ?? {};
        return {
          content: String(record.content ?? '')
        };
      })
    : [];

export let getRuleTool = readOnlyTool({
  name: 'Show SonarQube Rule Details',
  key: 'show_rule',
  description: 'Shows detailed information about a SonarQube rule.'
})
  .input(
    z.object({
      key: z.string().describe('The rule key (e.g. javascript:EmptyBlock)')
    })
  )
  .output(
    z.object({
      key: z.string().describe('Unique rule key'),
      name: z.string().describe('Rule display name'),
      severity: z.string().describe('Rule severity level'),
      type: z.string().describe('Rule type (BUG, VULNERABILITY, CODE_SMELL, etc.)'),
      lang: z.string().describe('Language key the rule applies to'),
      langName: z.string().describe('Human-readable language name'),
      htmlDesc: z.string().optional().describe('HTML description of the rule'),
      impacts: z
        .array(ruleImpactSchema)
        .optional()
        .describe('Software quality impacts of this rule'),
      descriptionSections: z
        .array(ruleDescriptionSectionSchema)
        .optional()
        .describe('Detailed description sections')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getRule(ctx.input.key);
    let rule = optionalRecord(data.rule) ?? data;

    return {
      output: {
        key: String(rule.key ?? ''),
        name: String(rule.name ?? ''),
        severity: String(rule.severity ?? ''),
        type: String(rule.type ?? ''),
        lang: String(rule.lang ?? ''),
        langName: String(rule.langName ?? ''),
        htmlDesc: optionalString(rule.htmlDesc),
        impacts: mapImpacts(rule.impacts),
        descriptionSections: mapDescriptionSections(rule.descriptionSections)
      },
      message: `Retrieved SonarQube rule **${ctx.input.key}**.`
    };
  })
  .build();
