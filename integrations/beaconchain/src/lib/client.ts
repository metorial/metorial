import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';

export type Chain = 'mainnet' | 'hoodi';

export interface ValidatorSelector {
  validatorIdentifiers?: (string | number)[];
  dashboardId?: number;
  groupId?: number;
}

export type EvaluationWindow = '24h' | '7d' | '30d' | '90d' | 'all_time';

export interface PaginationParams {
  pageSize?: number;
  cursor?: string;
}

export class BeaconchainClient {
  private axios: ReturnType<typeof createAxios>;
  private finalizedEpoch?: Promise<number>;

  constructor(private params: { token: string; chain: Chain }) {
    if (!params.token.trim()) {
      throw createApiServiceError('A Beaconcha.in API key is required.');
    }
    this.axios = createAxios({
      baseURL: 'https://beaconcha.in',
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  private async request(
    path: string,
    method: 'GET' | 'POST' | 'DELETE',
    body?: Record<string, unknown>,
    networkHost = false
  ): Promise<any> {
    let baseURL =
      networkHost && this.params.chain === 'hoodi'
        ? 'https://hoodi.beaconcha.in'
        : 'https://beaconcha.in';
    let data = await requestAxiosData<any>(
      `${method} ${path}`,
      () =>
        this.axios.request({
          baseURL,
          method,
          url: path,
          data: body,
          headers: {
            Accept: path.startsWith('/api/v2/ethereum/')
              ? 'application/vnd.beaconcha.in.v2.1+json'
              : 'application/json',
            ...(path.startsWith('/api/v1/') ? { apikey: this.params.token } : {})
          }
        }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Beaconcha.in',
          reason: 'beaconchain_api_error',
          operation,
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          detailKeys: ['error', 'message', 'status', 'data']
        })
    );
    if (
      isApiErrorRecord(data) &&
      ((typeof data.error === 'string' && data.error.length > 0) ||
        (typeof data.status === 'string' && data.status.startsWith('ERROR')) ||
        (typeof data.code === 'number' && data.code !== 200))
    ) {
      throw createApiServiceError(
        `Beaconcha.in API ${method} ${path} failed: ${data.error ?? data.status ?? data.code}`,
        { reason: 'beaconchain_api_error' }
      );
    }
    return data;
  }

  private async v2Post(path: string, body: Record<string, unknown> = {}): Promise<any> {
    return this.request(`/api/v2/ethereum${path}`, 'POST', {
      chain: this.params.chain,
      ...body
    });
  }

  private buildValidatorSelector(selector: ValidatorSelector): Record<string, unknown> {
    if (
      (selector.dashboardId !== undefined) ===
      (selector.validatorIdentifiers !== undefined)
    ) {
      throw createApiServiceError(
        'Provide exactly one of validatorIdentifiers or dashboardId.'
      );
    }
    if (selector.dashboardId !== undefined) {
      if (!Number.isInteger(selector.dashboardId) || selector.dashboardId < 0) {
        throw createApiServiceError('dashboardId must be a non-negative integer.');
      }
      if (
        selector.groupId !== undefined &&
        (!Number.isInteger(selector.groupId) || selector.groupId < 0)
      ) {
        throw createApiServiceError('groupId must be a non-negative integer.');
      }
      return {
        validator: pickDefined({
          dashboard_id: selector.dashboardId,
          group_id: selector.groupId
        })
      };
    }
    if (selector.groupId !== undefined) {
      throw createApiServiceError('groupId requires dashboardId.');
    }
    let identifiers = selector.validatorIdentifiers!;
    if (
      identifiers.length === 0 ||
      identifiers.length > 100 ||
      identifiers.some(value =>
        typeof value === 'number'
          ? !Number.isInteger(value) || value < 0
          : !/^(?:[0-9]+|0x[0-9a-fA-F]{96})$/.test(value)
      )
    ) {
      throw createApiServiceError(
        'Provide 1-100 validator indices or 0x-prefixed 48-byte public keys. Your plan may allow fewer identifiers.'
      );
    }
    return { validator: { validator_identifiers: identifiers } };
  }

  private buildPagination(pagination?: PaginationParams): Record<string, unknown> {
    if (
      pagination?.pageSize !== undefined &&
      (!Number.isInteger(pagination.pageSize) ||
        pagination.pageSize < 1 ||
        pagination.pageSize > 10)
    ) {
      throw createApiServiceError('pageSize must be an integer from 1 to 10.');
    }
    return pickDefined({ page_size: pagination?.pageSize, cursor: pagination?.cursor });
  }

  private async resolveEpoch(epoch?: number): Promise<number> {
    if (epoch !== undefined) {
      if (!Number.isInteger(epoch) || epoch < 0) {
        throw createApiServiceError('epoch must be a non-negative integer.');
      }
      return epoch;
    }
    this.finalizedEpoch ??= this.getEpochOverview(undefined, 'finalized').then(response => {
      let value = response?.data?.epoch;
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
        throw createApiServiceError(
          'Beaconcha.in did not return a finalized epoch. Provide an explicit epoch.'
        );
      }
      return value;
    });
    return this.finalizedEpoch;
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
    return this.v2Post('/state/validator-statuses');
  }

  async getNetworkPerformanceAggregate(
    evaluationWindow: EvaluationWindow = '24h'
  ): Promise<any> {
    return this.v2Post('/performance-aggregate', {
      range: { evaluation_window: evaluationWindow }
    });
  }

  // ── Validators ───────────────────────────────────────────────────

  async getValidatorOverview(
    selector: ValidatorSelector,
    pagination?: PaginationParams
  ): Promise<any> {
    return this.v2Post('/validators', {
      ...this.buildValidatorSelector(selector),
      ...this.buildPagination(pagination)
    });
  }

  async getValidatorApyRoi(
    selector: ValidatorSelector,
    evaluationWindow: EvaluationWindow = '24h'
  ): Promise<any> {
    return this.v2Post('/validators/apy-roi', {
      ...this.buildValidatorSelector(selector),
      range: { evaluation_window: evaluationWindow }
    });
  }

  async getValidatorBalances(
    selector: ValidatorSelector,
    epoch?: number,
    pagination?: PaginationParams
  ): Promise<any> {
    let body: Record<string, unknown> = {
      ...this.buildValidatorSelector(selector),
      ...this.buildPagination(pagination)
    };
    body.epoch = await this.resolveEpoch(epoch);
    return this.v2Post('/validators/balances', body);
  }

  async getValidatorPerformanceAggregate(
    selector: ValidatorSelector,
    evaluationWindow: EvaluationWindow = '24h'
  ): Promise<any> {
    return this.v2Post('/validators/performance-aggregate', {
      ...this.buildValidatorSelector(selector),
      range: { evaluation_window: evaluationWindow }
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
    body.epoch = await this.resolveEpoch(epoch);
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
    body.epoch = await this.resolveEpoch(epoch);
    return this.v2Post('/validators/rewards-list', body);
  }

  async getValidatorRewardsAggregate(
    selector: ValidatorSelector,
    evaluationWindow: EvaluationWindow = 'all_time'
  ): Promise<any> {
    return this.v2Post('/validators/rewards-aggregate', {
      ...this.buildValidatorSelector(selector),
      range: { evaluation_window: evaluationWindow }
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

  async getValidatorStakingQueues(
    selector: ValidatorSelector,
    pagination?: PaginationParams
  ): Promise<any> {
    return this.v2Post('/validators/queues', {
      ...this.buildValidatorSelector(selector),
      ...this.buildPagination(pagination)
    });
  }

  async getValidatorBestMaintenanceWindow(selector: ValidatorSelector): Promise<any> {
    return this.v2Post('/validators/best-maintenance-window', {
      ...this.buildValidatorSelector(selector)
    });
  }

  // ── Slots ────────────────────────────────────────────────────────

  async getSlotOverview(slot: number): Promise<any> {
    return this.v2Post('/slot', { slot: { number: slot } });
  }

  async getSlotSyncCommitteeDuties(slot: number, pagination?: PaginationParams): Promise<any> {
    return this.v2Post('/slot/sync-committee-duties', {
      slot: { number: slot },
      ...this.buildPagination(pagination)
    });
  }

  async getSlotAttestationDuties(slot: number, pagination?: PaginationParams): Promise<any> {
    return this.v2Post('/slot/attestation-duties', {
      slot: { number: slot },
      ...this.buildPagination(pagination)
    });
  }

  async getSlotWithdrawals(slot: number, pagination?: PaginationParams): Promise<any> {
    return this.v2Post('/slot/withdrawals', {
      slot: { number: slot },
      ...this.buildPagination(pagination)
    });
  }

  async getSlotDeposits(slot: number, pagination?: PaginationParams): Promise<any> {
    return this.v2Post('/slot/deposits', {
      slot: { number: slot },
      ...this.buildPagination(pagination)
    });
  }

  // ── Blocks (Execution Layer) ─────────────────────────────────────

  async getBlockOverview(block: number): Promise<any> {
    return this.v2Post('/block', { block: { number: block } });
  }

  async getBlockRewards(block: number): Promise<any> {
    return this.v2Post('/block/rewards', { block: { number: block } });
  }

  // ── Sync Committee ───────────────────────────────────────────────

  async getSyncCommitteeOverview(period: number): Promise<any> {
    return this.v2Post('/sync-committee', { sync_committee_period: { number: period } });
  }

  async getSyncCommitteeValidators(
    period: number,
    pagination?: PaginationParams
  ): Promise<any> {
    return this.v2Post('/sync-committee/validators', {
      sync_committee_period: { number: period },
      ...this.buildPagination(pagination)
    });
  }

  // ── Entities (Premium) ──────────────────────────────────────────

  async getEntities(
    pagination?: PaginationParams,
    evaluationWindow: EvaluationWindow = '24h'
  ): Promise<any> {
    return this.v2Post('/entities', {
      ...this.buildPagination(pagination),
      range: { evaluation_window: evaluationWindow }
    });
  }

  async getSubEntities(
    entity: string,
    pagination?: PaginationParams,
    evaluationWindow: EvaluationWindow = '24h'
  ): Promise<any> {
    return this.v2Post('/entity/sub-entities', {
      entity,
      ...this.buildPagination(pagination),
      range: { evaluation_window: evaluationWindow }
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
    return this.request(
      `/api/v2/validator-dashboards/${dashboardId}/validators`,
      'POST',
      body,
      true
    );
  }

  async removeValidatorsFromDashboard(
    dashboardId: number,
    validators: (string | number)[]
  ): Promise<any> {
    return this.request(
      `/api/v2/validator-dashboards/${dashboardId}/validators/bulk-deletions`,
      'POST',
      { validators },
      true
    );
  }

  async removeValidatorsFromGroup(dashboardId: number, groupId: number): Promise<any> {
    return this.request(
      `/api/v2/validator-dashboards/${dashboardId}/groups/${groupId}/validators`,
      'DELETE',
      undefined,
      true
    );
  }

  async getEpochOverview(
    epoch?: number,
    view: 'latest' | 'finalized' = 'latest'
  ): Promise<any> {
    return this.v2Post('/epoch', {
      epoch: epoch === undefined ? { view } : { number: epoch }
    });
  }

  async getMachineNames(): Promise<any> {
    return this.request('/api/v2/machine-metrics/machine-names', 'POST', {});
  }

  async getMachineMetrics(
    start: number,
    end: number,
    machines?: string[],
    pagination?: PaginationParams
  ): Promise<any> {
    return this.request('/api/v2/machine-metrics', 'POST', {
      range: { timestamp: { start, end } },
      ...pickDefined({ machines }),
      ...this.buildPagination(pagination)
    });
  }

  // ── V1 API (GET-based, Legacy) ──────────────────────────────────

  private async v1Get(path: string): Promise<any> {
    return this.request(`/api/v1${path}`, 'GET', undefined, true);
  }

  async getGasNow(): Promise<any> {
    return this.v1Get('/execution/gasnow');
  }

  async getExecutionAddress(address: string): Promise<any> {
    return this.v1Get(`/execution/address/${encodeURIComponent(address)}`);
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
    return this.v1Get(`/execution/address/${encodeURIComponent(address)}/erc20tokens${query}`);
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
