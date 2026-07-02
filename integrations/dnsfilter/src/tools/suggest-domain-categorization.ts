import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let suggestDomainCategorization = SlateTool.create(spec, {
  name: 'Suggest Domain Categorization',
  key: 'suggest_domain_categorization',
  description: `Submit a domain for categorization review or report it as a threat. Use "category" type to suggest a category change, or "threat" to report a domain as malicious (phishing, malware, botnet, etc.).`
})
  .input(
    z.object({
      type: z
        .enum(['category', 'threat'])
        .describe('"category" to suggest a recategorization, "threat" to report a threat'),
      domain: z.string().describe('Fully qualified domain name'),
      suggestedCategory: z
        .string()
        .optional()
        .describe('Suggested category (for category type)'),
      threatType: z.string().optional().describe('Type of threat (for threat type)'),
      notes: z.string().optional().describe('Additional notes about the submission')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.any()).describe('Submission result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result: any;
    if (ctx.input.type === 'category') {
      result = await client.suggestDomainCategories({
        domain: ctx.input.domain,
        suggested_category: ctx.input.suggestedCategory,
        notes: ctx.input.notes
      });
    } else {
      result = await client.suggestDomainThreat({
        domain: ctx.input.domain,
        threat_type: ctx.input.threatType,
        notes: ctx.input.notes
      });
    }

    return {
      output: { result },
      message: `Submitted ${ctx.input.type} suggestion for **${ctx.input.domain}**.`
    };
  })
  .build();
