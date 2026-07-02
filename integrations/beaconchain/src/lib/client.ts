import { createAxios } from 'slates';

export type Chain = 'mainnet' | 'hoodi';

export interface ValidatorSelector {
  validatorIdentifiers?: (string | number)[];
  dashboardId?: number;
}

export interface PaginationParams {
  pageSize?: number;
  cursor?: string;
}

export class BeaconchainClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(private params: { token: string; chain: Chain }) {
    this.axios = createAxios({
      baseURL: 'https://beaconcha.in',
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── V2 API (POST-based) ──────────────────────────────────────────

  private async v2Post(path: string, body: Record<string, unknown> = {}): Promise<any> {
    let response = await this.axios.post(`/api/v2/ethereum${path}`, {
      chain: this.params.chain,
      ...body
    });
    return response.data;
  }

  private buildValidatorSelector(selector: ValidatorSelector): Record<string, unknown> {
    if (selector.dashboardId !== undefined) {
      return { validator: { dashboard_id: selector.dashboardId } };
    }
    if (selector.validatorIdentifiers) {
      return { validator: { validator_identifiers: selector.validatorIdentifiers } };
    }
    return {};
  }

  private buildPagination(pagination?: PaginationParams): Record<string, unknown> {
    let result: Record<string, unknown> = {};
    if (pagination?.pageSize) result.page_size = pagination.pageSize;
    if (pagination?.cursor) result.cursor = pagination.cursor;
    return result;
  }

  // ── Chain State ──────────────────────────────────────────────────

  async getChainState(): Promise<any> {
    return this.v2Post('/state');
  }

  async getNetworkConfig(): Promise<any> {
    return this.v2Post('/config');
  }

  async getStakingQueues(): Promise<any> {
    return this.v2Post('/queues');
  }

  async getValidatorStates(): Promise<any> {
    return this.v2Post('/validator/states');
  }

  async getNetworkPerformanceAggregate(): Promise<any> {
    return this.v2Post('/performance-aggregate');
  }

  // ── Validators ───────────────────────────────────────────────────

  async getValidatorOverview(selector: ValidatorSelector): Promise<any> {
    return this.v2Post('/validators', {
      ...this.buildValidatorSelector(selector)
    });
  }

  async getValidatorApyRoi(selector: ValidatorSelector): Promise<any> {
    return this.v2Post('/validators/apy-roi', {
      ...this.buildValidatorSelector(selector)
    });
  }

  async getValidatorBalances(selector: ValidatorSelector, epoch?: number): Promise<any> {
    let body: Record<string, unknown> = {
      ...this.buildValidatorSelector(selector)
    };
    if (epoch !== undefined) body.epoch = epoch;
    return this.v2Post('/validators/balances', body);
  }

  async getValidatorPerformanceAggregate(selector: ValidatorSelector): Promise<any> {
    return this.v2Post('/validators/performance-aggregate', {
      ...this.buildValidatorSelector(selector)
    });
  }

  async getValidatorPerformanceList(
    selector: ValidatorSelector,
    epoch?: number,
    pagination?: PaginationParams
  ): Promise<any> {
    let body: Record<string, unknown> = {
      ...this.buildValidatorSelector(selector),
      ...this.buildPagination(pagination)
    };
    if (epoch !== undefined) body.epoch = epoch;
    return this.v2Post('/validators/performance-list', body);
  }

  // ── Rewards ──────────────────────────────────────────────────────

  async getValidatorRewardsList(
    selector: ValidatorSelector,
    epoch?: number,
    pagination?: PaginationParams
  ): Promise<any> {
    let body: Record<string, unknown> = {
      ...this.buildValidatorSelector(selector),
      ...this.buildPagination(pagination)
    };
    if (epoch !== undefined) body.epoch = epoch;
    return this.v2Post('/validators/rewards-list', body);
  }

  async getValidatorRewardsAggregate(selector: ValidatorSelector): Promise<any> {
    return this.v2Post('/validators/rewards-aggregate', {
      ...this.buildValidatorSelector(selector)
    });
  }

  // ── Duties ───────────────────────────────────────────────────────

  async getValidatorUpcomingDutySlots(selector: ValidatorSelector): Promise<any> {
    return this.v2Post('/validators/upcoming-duty-slots', {
      ...this.buildValidatorSelector(selector)
    });
  }

  async getValidatorProposalSlots(
    selector: ValidatorSelector,
    pagination?: PaginationParams
  ): Promise<any> {
    return this.v2Post('/validators/proposal-slots', {
      ...this.buildValidatorSelector(selector),
      ...this.buildPagination(pagination)
    });
  }

  async getValidatorAttestationSlots(
    selector: ValidatorSelector,
    pagination?: PaginationParams
  ): Promise<any> {
    return this.v2Post('/validators/attestation-slots', {
      ...this.buildValidatorSelector(selector),
      ...this.buildPagination(pagination)
    });
  }

  async getValidatorSyncCommitteePeriods(
    selector: ValidatorSelector,
    pagination?: PaginationParams
  ): Promise<any> {
    return this.v2Post('/validators/sync-committee-periods', {
      ...this.buildValidatorSelector(selector),
      ...this.buildPagination(pagination)
    });
  }

  async getValidatorDepositSlots(
    selector: ValidatorSelector,
    pagination?: PaginationParams
  ): Promise<any> {
    return this.v2Post('/validators/deposit-slots', {
      ...this.buildValidatorSelector(selector),
      ...this.buildPagination(pagination)
    });
  }

  async getValidatorWithdrawalSlots(
    selector: ValidatorSelector,
    pagination?: PaginationParams
  ): Promise<any> {
    return this.v2Post('/validators/withdrawal-slots', {
      ...this.buildValidatorSelector(selector),
      ...this.buildPagination(pagination)
    });
  }

  async getValidatorStakingQueues(selector: ValidatorSelector): Promise<any> {
    return this.v2Post('/validators/queues', {
      ...this.buildValidatorSelector(selector)
    });
  }

  async getValidatorBestMaintenanceWindow(selector: ValidatorSelector): Promise<any> {
    return this.v2Post('/validators/best-maintenance-window', {
      ...this.buildValidatorSelector(selector)
    });
  }

  // ── Slots ────────────────────────────────────────────────────────

  async getSlotOverview(slot: number): Promise<any> {
    return this.v2Post('/slot', { slot });
  }

  async getSlotSyncCommitteeDuties(slot: number, pagination?: PaginationParams): Promise<any> {
    return this.v2Post('/slot/sync-committee-duties', {
      slot,
      ...this.buildPagination(pagination)
    });
  }

  async getSlotAttestationDuties(slot: number, pagination?: PaginationParams): Promise<any> {
    return this.v2Post('/slot/attestation-duties', {
      slot,
      ...this.buildPagination(pagination)
    });
  }

  async getSlotWithdrawals(slot: number): Promise<any> {
    return this.v2Post('/withdrawals', { slot });
  }

  async getSlotDeposits(slot: number): Promise<any> {
    return this.v2Post('/deposits', { slot });
  }

  // ── Blocks (Execution Layer) ─────────────────────────────────────

  async getBlockOverview(block: number): Promise<any> {
    return this.v2Post('/block', { block });
  }

  async getBlockRewards(block: number): Promise<any> {
    return this.v2Post('/block/rewards', { block });
  }

  // ── Sync Committee ───────────────────────────────────────────────

  async getSyncCommitteeOverview(period: number): Promise<any> {
    return this.v2Post('/sync-committee', { period });
  }

  async getSyncCommitteeValidators(
    period: number,
    pagination?: PaginationParams
  ): Promise<any> {
    return this.v2Post('/sync-committee/validators', {
      period,
      ...this.buildPagination(pagination)
    });
  }

  // ── Entities (Premium) ──────────────────────────────────────────

  async getEntities(pagination?: PaginationParams): Promise<any> {
    return this.v2Post('/entities', {
      ...this.buildPagination(pagination)
    });
  }

  async getSubEntities(entity: string, pagination?: PaginationParams): Promise<any> {
    return this.v2Post('/entity/sub-entities', {
      entity,
      ...this.buildPagination(pagination)
    });
  }

  // ── Validator Dashboard Management ──────────────────────────────

  async addValidatorsToDashboard(
    dashboardId: number,
    validators: (string | number)[],
    groupId?: number
  ): Promise<any> {
    let body: Record<string, unknown> = {
      validators: validators
    };
    if (groupId !== undefined) body.group_id = groupId;
    let response = await this.axios.post(
      `/api/v2/validator-dashboards/${dashboardId}/validators`,
      body
    );
    return response.data;
  }

  async removeValidatorsFromDashboard(
    dashboardId: number,
    validators: (string | number)[]
  ): Promise<any> {
    let response = await this.axios.post(
      `/api/v2/validator-dashboards/${dashboardId}/validators/bulk-deletions`,
      {
        validators: validators
      }
    );
    return response.data;
  }

  async removeValidatorsFromGroup(dashboardId: number, groupId: number): Promise<any> {
    let response = await this.axios.delete(
      `/api/v2/validator-dashboards/${dashboardId}/groups/${groupId}/validators`
    );
    return response.data;
  }

  // ── V1 API (GET-based, Legacy) ──────────────────────────────────

  private async v1Get(path: string): Promise<any> {
    let response = await this.axios.get(`/api/v1${path}`);
    return response.data;
  }

  async getGasNow(): Promise<any> {
    return this.v1Get('/execution/gasnow');
  }

  async getExecutionAddress(address: string): Promise<any> {
    return this.v1Get(`/execution/address/${address}`);
  }

  async getExecutionAddressTokens(
    address: string,
    offset?: number,
    limit?: number
  ): Promise<any> {
    let params: string[] = [];
    if (offset !== undefined) params.push(`offset=${offset}`);
    if (limit !== undefined) params.push(`limit=${limit}`);
    let query = params.length > 0 ? `?${params.join('&')}` : '';
    return this.v1Get(`/execution/address/${address}/erc20tokens${query}`);
  }

  async getEthStore(day: string | number = 'latest'): Promise<any> {
    return this.v1Get(`/ethstore/${day}`);
  }

  async getValidatorQueue(): Promise<any> {
    return this.v1Get('/validators/queue');
  }

  async getEpoch(epoch: number | string): Promise<any> {
    return this.v1Get(`/epoch/${epoch}`);
  }

  async getLatestState(): Promise<any> {
    return this.v1Get('/latestState');
  }

  async getRocketPoolStats(): Promise<any> {
    return this.v1Get('/rocketpool/stats');
  }
}
