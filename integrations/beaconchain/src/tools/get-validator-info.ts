import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconchainClient } from '../lib/client';
import { spec } from '../spec';

let validatorSelectorSchema = z
  .object({
    validatorIdentifiers: z
      .array(z.union([z.string(), z.number()]))
      .optional()
      .describe(
        'Array of validator indices (numbers) or public keys (hex strings). Max 20 for free tier, 100 for paid.'
      ),
    dashboardId: z
      .number()
      .optional()
      .describe(
        'Dashboard ID to select validators from. Use this instead of individual identifiers.'
      )
  })
  .describe('Specify validators by indices/pubkeys or by dashboard ID');

export let getValidatorInfo = SlateTool.create(spec, {
  name: 'Get Validator Info',
  key: 'get_validator_info',
  description: `Retrieve overview information for one or more Ethereum validators including status, balance, activation epoch, and withdrawal credentials.
Optionally include APY/ROI data and balance at a specific epoch. Validators can be selected by index, public key, or dashboard ID.`,
  instructions: [
    'Provide either validatorIdentifiers OR dashboardId, not both.',
    'Validator identifiers can be numeric indices (e.g., 1, 100) or hex public keys (e.g., "0xa1d1ad0714035353...").'
  ],
  constraints: ['Free tier: up to 20 validator identifiers per request. Paid: up to 100.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      validators: validatorSelectorSchema,
      includeApyRoi: z
        .boolean()
        .optional()
        .describe('Include annual percentage yield and ROI data'),
      includeBalances: z.boolean().optional().describe('Include validator balances'),
      balanceEpoch: z
        .number()
        .optional()
        .describe('Specific epoch to retrieve balances for. If omitted, returns the latest.')
    })
  )
  .output(
    z.object({
      overview: z
        .any()
        .describe('Validator overview data including status, balance, activation epoch'),
      apyRoi: z
        .any()
        .optional()
        .describe('Annual percentage yield and ROI for the validators'),
      balances: z
        .any()
        .optional()
        .describe('Validator balances at the specified or latest epoch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconchainClient({
      token: ctx.auth.token,
      chain: ctx.config.chain
    });

    let selector = {
      validatorIdentifiers: ctx.input.validators.validatorIdentifiers,
      dashboardId: ctx.input.validators.dashboardId
    };

    let overview = await client.getValidatorOverview(selector);

    let result: Record<string, any> = { overview };

    if (ctx.input.includeApyRoi) {
      result.apyRoi = await client.getValidatorApyRoi(selector);
    }

    if (ctx.input.includeBalances) {
      result.balances = await client.getValidatorBalances(selector, ctx.input.balanceEpoch);
    }

    let count = ctx.input.validators.validatorIdentifiers?.length ?? 'dashboard';
    return {
      output: result as any,
      message: `Retrieved info for **${count}** validator(s) on ${ctx.config.chain}.`
    };
  })
  .build();
