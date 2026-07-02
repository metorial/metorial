import { createAxios } from 'slates';

export interface BooleanVariable {
  id: string;
  name: string;
  value: boolean;
  created_at: string;
  updated_at: string;
}

export interface StringVariable {
  id: string;
  name: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export interface NumericVariable {
  id: string;
  name: string;
  value: number;
  created_at: string;
  updated_at: string;
}

export interface Condition {
  id: string;
  name: string;
  met: boolean;
  created_at: string;
  updated_at: string;
}

export interface Logicblock {
  id: string;
  name: string;
  active: boolean;
  result: boolean | null;
  created_at: string;
  updated_at: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.apilio.com/api/v1',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      auth: {
        username: config.token,
        password: ''
      }
    });
  }

  // Boolean Variables
  async listBooleanVariables(): Promise<BooleanVariable[]> {
    let response = await this.axios.get('/boolean_variables');
    return response.data.boolean_variables ?? response.data;
  }

  async getBooleanVariable(variableId: string): Promise<BooleanVariable> {
    let response = await this.axios.get(`/boolean_variables/${variableId}`);
    return response.data.boolean_variable ?? response.data;
  }

  async updateBooleanVariable(variableId: string, value: boolean): Promise<BooleanVariable> {
    let response = await this.axios.put(`/boolean_variables/${variableId}`, {
      boolean_variable: { value }
    });
    return response.data.boolean_variable ?? response.data;
  }

  // String Variables
  async listStringVariables(): Promise<StringVariable[]> {
    let response = await this.axios.get('/string_variables');
    return response.data.string_variables ?? response.data;
  }

  async getStringVariable(variableId: string): Promise<StringVariable> {
    let response = await this.axios.get(`/string_variables/${variableId}`);
    return response.data.string_variable ?? response.data;
  }

  async updateStringVariable(
    variableId: string,
    value: string | null
  ): Promise<StringVariable> {
    let response = await this.axios.put(`/string_variables/${variableId}`, {
      string_variable: { value }
    });
    return response.data.string_variable ?? response.data;
  }

  // Numeric Variables
  async listNumericVariables(): Promise<NumericVariable[]> {
    let response = await this.axios.get('/numeric_variables');
    return response.data.numeric_variables ?? response.data;
  }

  async getNumericVariable(variableId: string): Promise<NumericVariable> {
    let response = await this.axios.get(`/numeric_variables/${variableId}`);
    return response.data.numeric_variable ?? response.data;
  }

  async updateNumericVariable(variableId: string, value: number): Promise<NumericVariable> {
    let response = await this.axios.put(`/numeric_variables/${variableId}`, {
      numeric_variable: { value }
    });
    return response.data.numeric_variable ?? response.data;
  }

  // Conditions
  async listConditions(): Promise<Condition[]> {
    let response = await this.axios.get('/conditions');
    return response.data.conditions ?? response.data;
  }

  async getCondition(conditionId: string): Promise<Condition> {
    let response = await this.axios.get(`/conditions/${conditionId}`);
    return response.data.condition ?? response.data;
  }

  // Logicblocks
  async listLogicblocks(): Promise<Logicblock[]> {
    let response = await this.axios.get('/logicblocks');
    return response.data.logicblocks ?? response.data;
  }

  async getLogicblock(logicblockId: string): Promise<Logicblock> {
    let response = await this.axios.get(`/logicblocks/${logicblockId}`);
    return response.data.logicblock ?? response.data;
  }

  async evaluateLogicblock(logicblockId: string): Promise<Logicblock> {
    let response = await this.axios.put(`/logicblocks/${logicblockId}/evaluate`, {});
    return response.data.logicblock ?? response.data;
  }

  async updateLogicblockActive(logicblockId: string, active: boolean): Promise<Logicblock> {
    let response = await this.axios.put(`/logicblocks/${logicblockId}`, {
      logicblock: { active }
    });
    return response.data.logicblock ?? response.data;
  }
}
