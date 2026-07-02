import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconchainClient } from '../lib/client';
import { spec } from '../spec';

let validatorSelectorSchema = z.object({
  validatorIdentifiers: z
    .array(z.union([z.string(), z.number()]))
    .optional()
    .describe('Array of validator indices or public keys'),
  dashboardId: z.number().optional().describe('Dashboard ID to select validators from')
});

export let getValidatorDuties = SlateTool.create(spec, {
  name: 'Get Validator Duties',
  key: 'get_validator_duties',
  description: `Retrieve validator duty assignments including upcoming duties, historical block proposals, attestation slots, sync committee periods, deposits, and withdrawals.
Also supports finding the best maintenance window for validators to minimize missed duties.`,
  instructions: [
    'Use "upcoming" to see duties for the current and next epoch.',
    'Use "proposals", "attestations", "sync_committee", "deposits", or "withdrawals" for historical duty data.',
    'Use "maintenance_window" to find the optimal time to take validators offline.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      validators: validatorSelectorSchema,
      dutyType: z
        .enum([
          'upcoming',
          'proposals',
          'attestations',
          'sync_committee',
          'deposits',
          'withdrawals',
          'maintenance_window'
        ])
        .describe('Type of duty data to retrieve'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (1-100, for historical duties)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      duties: z.any().describe('Duty data matching the requested type'),
      paging: z.any().optional().describe('Pagination info if applicable')
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

    let pagination = { pageSize: ctx.input.pageSize, cursor: ctx.input.cursor };
    let result: Record<string, any>;

    switch (ctx.input.dutyType) {
      case 'upcoming': {
        let response = await client.getValidatorUpcomingDutySlots(selector);
        result = { duties: response };
        break;
      }
      case 'proposals': {
        let response = await client.getValidatorProposalSlots(selector, pagination);
        result = { duties: response.data ?? response, paging: response.paging };
        break;
      }
      case 'attestations': {
        let response = await client.getValidatorAttestationSlots(selector, pagination);
        result = { duties: response.data ?? response, paging: response.paging };
        break;
      }
      case 'sync_committee': {
        let response = await client.getValidatorSyncCommitteePeriods(selector, pagination);
        result = { duties: response.data ?? response, paging: response.paging };
        break;
      }
      case 'deposits': {
        let response = await client.getValidatorDepositSlots(selector, pagination);
        result = { duties: response.data ?? response, paging: response.paging };
        break;
      }
      case 'withdrawals': {
        let response = await client.getValidatorWithdrawalSlots(selector, pagination);
        result = { duties: response.data ?? response, paging: response.paging };
        break;
      }
      case 'maintenance_window': {
        let response = await client.getValidatorBestMaintenanceWindow(selector);
        result = { duties: response };
        break;
      }
    }

    return {
      output: result! as any,
      message: `Retrieved **${ctx.input.dutyType}** duties for validators on ${ctx.config.chain}.`
    };
  })
  .build();
