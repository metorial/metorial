import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapSummary } from '../lib/response';
import { spec } from '../spec';

let keywordPositionSchema = z
  .object({
    pos1: z.number().optional(),
    pos2_3: z.number().optional(),
    pos4_10: z.number().optional(),
    pos11_20: z.number().optional(),
    pos21_30: z.number().optional(),
    pos31_40: z.number().optional(),
    pos41_50: z.number().optional(),
    pos51_60: z.number().optional(),
    pos61_70: z.number().optional(),
    pos71_80: z.number().optional(),
    pos81_90: z.number().optional(),
    pos91_100: z.number().optional(),
    count: z.number().optional(),
    isNew: z.number().optional(),
    isUp: z.number().optional(),
    isDown: z.number().optional(),
    isLost: z.number().optional(),
    estimatedTraffic: z.number().optional(),
    estimatedAdBudget: z.number().optional(),
    estimatedAvgCpc: z.number().optional()
  })
  .passthrough();

export let analyzeKeywords = SlateTool.create(spec, {
  name: 'Analyze Keywords',
  key: 'analyze_keywords',
  description: `Get an overview of paid and organic keywords for a domain. Returns keyword position distribution, traffic estimates, estimated ad budget, CPC, and trends (new, rising, declining, lost keywords). Useful for competitive keyword intelligence and estimating a company's search advertising spend.`,
  instructions: [
    'Domain must be in bare format like "hubspot.com" without https:// or www. prefix.'
  ],
  constraints: [
    'Each successful API call consumes 1 credit.',
    'Budget and CPC figures are estimates based on publicly available data.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companyDomain: z
        .string()
        .describe('Company website domain in bare format, e.g. "hubspot.com"')
    })
  )
  .output(
    z.object({
      organic: keywordPositionSchema.optional(),
      organicPercentages: keywordPositionSchema.optional(),
      paid: keywordPositionSchema.optional(),
      paidPercentages: keywordPositionSchema.optional(),
      rawResponse: z
        .unknown()
        .optional()
        .describe('Complete provider response with original keyword metrics and nulls')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    let response = await client.getKeywordAnalysis({
      companyDomain: ctx.input.companyDomain
    });

    let mapPositionData = (data: unknown) =>
      mapSummary(keywordPositionSchema, data, {
        pos1: 'pos_1',
        pos2_3: 'pos_2_3',
        pos4_10: 'pos_4_10',
        pos11_20: 'pos_11_20',
        pos21_30: 'pos_21_30',
        pos31_40: 'pos_31_40',
        pos41_50: 'pos_41_50',
        pos51_60: 'pos_51_60',
        pos61_70: 'pos_61_70',
        pos71_80: 'pos_71_80',
        pos81_90: 'pos_81_90',
        pos91_100: 'pos_91_100',
        isNew: 'is_new',
        isUp: 'is_up',
        isDown: 'is_down',
        isLost: 'is_lost',
        estimatedTraffic: 'estimated_traffic',
        estimatedAdBudget: 'estimated_ad_budget',
        estimatedAvgCpc: 'estimated_avg_cpc'
      });

    let organic = mapPositionData(response?.organic);
    let paid = mapPositionData(response?.paid);

    let organicCount = organic?.count;
    let paidCount = paid?.count;
    let budget =
      paid?.estimatedAdBudget !== undefined
        ? `$${paid.estimatedAdBudget.toLocaleString()}`
        : 'N/A';

    return {
      output: {
        organic,
        organicPercentages: mapPositionData(
          response?.organic_percentages ?? response?.organicPercentages
        ),
        paid,
        paidPercentages: mapPositionData(
          response?.paid_percentages ?? response?.paidPercentages
        ),
        rawResponse: response
      },
      message: `Keyword analysis for **${ctx.input.companyDomain}**: **${organicCount ?? 'unavailable'}** organic keywords, **${paidCount ?? 'unavailable'}** paid keywords, estimated ad budget: **${budget}**.`
    };
  })
  .build();
