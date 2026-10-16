import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

interface Resource {
  id: string;
  name: string;
  created_at?: string;
  updated_at: string;
}

export interface BooleanVariable extends Resource {
  value: boolean;
}

export interface StringVariable extends Resource {
  value: string | null;
}

export interface NumericVariable extends Resource {
  value: number;
}

export interface Condition extends Resource {
  met?: boolean;
}

export interface Logicblock extends Resource {
  active: boolean;
  result?: boolean | null;
}

export type ConditionType = 'variable' | 'time' | 'tuya';

type ApiResource<T> = Omit<T, 'id'> & { uuid: string; id?: string };
type ApiNumericVariable = Omit<ApiResource<NumericVariable>, 'value'> & {
  value: string | number;
};
type ApiCondition = ApiResource<Condition> & { evaluate?: boolean };
type ApiLogicblock = ApiResource<Logicblock> & {
  evaluate?: boolean;
  last_evaluation_result?: boolean | null;
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    let key = config.token.trim().replace(/^Basic\s+/i, '');
    if (!key) {
      throw createApiServiceError(
        'Provide the preformatted Basic authentication key from your Apilio profile, then reconnect.',
        { reason: 'apilio_missing_credentials' }
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.apilio.com/api/v1',
      timeout: 30_000,
      authHeader: { value: `Basic ${key}` },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Apilio',
          reason: 'apilio_api_error',
          extractResponse: (value, helpers) => helpers.getResponseWithBody(value)
        })
    });
  }

  async listBooleanVariables(): Promise<BooleanVariable[]> {
    let response = await this.axios.get('/boolean_variables');
    let variables: ApiResource<BooleanVariable>[] =
      response.data.boolean_variables ?? response.data;
    return variables.map(variable => ({ ...variable, id: variable.uuid ?? variable.id }));
  }

  async getBooleanVariable(variableId: string): Promise<BooleanVariable> {
    let response = await this.axios.get(
      `/boolean_variables/${encodeURIComponent(variableId)}`
    );
    let variable: ApiResource<BooleanVariable> =
      response.data.boolean_variable ?? response.data;
    return { ...variable, id: variable.uuid ?? variable.id };
  }

  async updateBooleanVariable(variableId: string, value: boolean): Promise<BooleanVariable> {
    let response = await this.axios.put(
      `/boolean_variables/${encodeURIComponent(variableId)}`,
      {
        boolean_variable: { value }
      }
    );
    let variable: ApiResource<BooleanVariable> =
      response.data.boolean_variable ?? response.data;
    return { ...variable, id: variable.uuid ?? variable.id };
  }

  async listStringVariables(): Promise<StringVariable[]> {
    let response = await this.axios.get('/string_variables');
    let variables: ApiResource<StringVariable>[] =
      response.data.string_variables ?? response.data;
    return variables.map(variable => ({ ...variable, id: variable.uuid ?? variable.id }));
  }

  async getStringVariable(variableId: string): Promise<StringVariable> {
    let response = await this.axios.get(`/string_variables/${encodeURIComponent(variableId)}`);
    let variable: ApiResource<StringVariable> = response.data.string_variable ?? response.data;
    return { ...variable, id: variable.uuid ?? variable.id };
  }

  async updateStringVariable(
    variableId: string,
    value: string | null
  ): Promise<StringVariable> {
    let response = await this.axios.put(
      `/string_variables/${encodeURIComponent(variableId)}`,
      {
        string_variable: { value }
      }
    );
    let variable: ApiResource<StringVariable> = response.data.string_variable ?? response.data;
    return { ...variable, id: variable.uuid ?? variable.id };
  }

  private numericVariable(variable: ApiNumericVariable): NumericVariable {
    let value =
      typeof variable.value === 'number'
        ? variable.value
        : typeof variable.value === 'string' && variable.value.trim() !== ''
          ? Number(variable.value)
          : Number.NaN;
    if (!Number.isFinite(value)) {
      throw createApiServiceError('Apilio returned an invalid numeric variable value.', {
        reason: 'apilio_invalid_numeric_value'
      });
    }
    return { ...variable, id: variable.uuid ?? variable.id, value };
  }

  async listNumericVariables(): Promise<NumericVariable[]> {
    let response = await this.axios.get('/numeric_variables');
    let variables: ApiNumericVariable[] = response.data.numeric_variables ?? response.data;
    return variables.map(variable => this.numericVariable(variable));
  }

  async getNumericVariable(variableId: string): Promise<NumericVariable> {
    let response = await this.axios.get(
      `/numeric_variables/${encodeURIComponent(variableId)}`
    );
    return this.numericVariable(response.data.numeric_variable ?? response.data);
  }

  async updateNumericVariable(variableId: string, value: number): Promise<NumericVariable> {
    let response = await this.axios.put(
      `/numeric_variables/${encodeURIComponent(variableId)}`,
      {
        numeric_variable: { value }
      }
    );
    return this.numericVariable(response.data.numeric_variable ?? response.data);
  }

  async listConditions(conditionType?: ConditionType): Promise<Condition[]> {
    let path = conditionType ? `/${conditionType}conditions` : '/conditions';
    let response = await this.axios.get(path);
    let conditions: ApiCondition[] = response.data.conditions ?? response.data;
    return conditions.map(condition => ({
      ...condition,
      id: condition.uuid ?? condition.id,
      met: condition.evaluate ?? condition.met
    }));
  }

  async getCondition(
    conditionId: string,
    conditionType?: ConditionType
  ): Promise<Condition & { met: boolean }> {
    let resolvedType = conditionType;
    if (!resolvedType) {
      for (let type of ['variable', 'time', 'tuya'] as const) {
        let conditions = await this.listConditions(type);
        if (conditions.some(condition => condition.id === conditionId)) {
          resolvedType = type;
          break;
        }
      }
    }
    if (!resolvedType) {
      throw createApiServiceError(
        'Condition not found. Call list_conditions to discover a current condition ID.',
        { reason: 'apilio_condition_not_found' }
      );
    }
    let response = await this.axios.get(
      `/${resolvedType}conditions/${encodeURIComponent(conditionId)}`
    );
    let condition: ApiCondition & { evaluate: boolean } =
      response.data.condition ?? response.data;
    return {
      ...condition,
      id: condition.uuid ?? condition.id,
      met: condition.evaluate ?? condition.met
    };
  }

  async listLogicblocks(): Promise<(Logicblock & { result: boolean | null })[]> {
    let response = await this.axios.get('/logicblocks');
    let logicblocks: (ApiLogicblock & { last_evaluation_result: boolean | null })[] =
      response.data.logicblocks ?? response.data;
    return logicblocks.map(logicblock => ({
      ...logicblock,
      id: logicblock.uuid ?? logicblock.id,
      result: logicblock.last_evaluation_result
    }));
  }

  async evaluateLogicblock(
    logicblockId: string
  ): Promise<Logicblock & { result: boolean | null }> {
    let response = await this.axios.post(
      `/logicblocks/${encodeURIComponent(logicblockId)}/evaluate`
    );
    let logicblock: ApiLogicblock & { evaluate: boolean } =
      response.data.logicblock ?? response.data;
    return {
      ...logicblock,
      id: logicblock.uuid ?? logicblock.id,
      result: logicblock.evaluate ?? logicblock.result
    };
  }

  async updateLogicblockActive(logicblockId: string, active: boolean): Promise<Logicblock> {
    let response = await this.axios.patch(`/logicblocks/${encodeURIComponent(logicblockId)}`, {
      logicblock: { active }
    });
    let logicblock: ApiLogicblock = response.data.logicblock ?? response.data;
    return {
      ...logicblock,
      id: logicblock.uuid ?? logicblock.id,
      result:
        logicblock.last_evaluation_result !== undefined
          ? logicblock.last_evaluation_result
          : logicblock.result
    };
  }
}
