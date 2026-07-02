import { createAxios } from 'slates';

let regionBaseUrls: Record<string, string> = {
  us: 'https://console.kaleido.io/api/v1',
  eu: 'https://console-eu.kaleido.io/api/v1',
  ap: 'https://console-ap.kaleido.io/api/v1',
  ko: 'https://console-ko.kaleido.io/api/v1',
  us1: 'https://console-us1.kaleido.io/api/v1',
  eu1: 'https://console-eu1.kaleido.io/api/v1'
};

export class KaleidoClient {
  private api: ReturnType<typeof createAxios>;

  constructor(config: { token: string; region: string }) {
    let baseURL = regionBaseUrls[config.region] || regionBaseUrls.us;

    this.api = createAxios({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  // --- Consortia ---

  async listConsortia(): Promise<any[]> {
    let response = await this.api.get('/consortia');
    return response.data;
  }

  async getConsortium(consortiumId: string): Promise<any> {
    let response = await this.api.get(`/consortia/${consortiumId}`);
    return response.data;
  }

  async createConsortium(params: {
    name: string;
    description?: string;
    mode?: string;
  }): Promise<any> {
    let response = await this.api.post('/consortia', params);
    return response.data;
  }

  async updateConsortium(
    consortiumId: string,
    params: { name?: string; description?: string }
  ): Promise<any> {
    let response = await this.api.patch(`/consortia/${consortiumId}`, params);
    return response.data;
  }

  async deleteConsortium(consortiumId: string): Promise<any> {
    let response = await this.api.delete(`/consortia/${consortiumId}`);
    return response.data;
  }

  // --- Memberships ---

  async listMemberships(consortiumId: string): Promise<any[]> {
    let response = await this.api.get(`/consortia/${consortiumId}/memberships`);
    return response.data;
  }

  async getMembership(consortiumId: string, membershipId: string): Promise<any> {
    let response = await this.api.get(
      `/consortia/${consortiumId}/memberships/${membershipId}`
    );
    return response.data;
  }

  async createMembership(consortiumId: string, params: { org_name: string }): Promise<any> {
    let response = await this.api.post(`/consortia/${consortiumId}/memberships`, params);
    return response.data;
  }

  async deleteMembership(consortiumId: string, membershipId: string): Promise<any> {
    let response = await this.api.delete(
      `/consortia/${consortiumId}/memberships/${membershipId}`
    );
    return response.data;
  }

  // --- Environments ---

  async listEnvironments(consortiumId: string): Promise<any[]> {
    let response = await this.api.get(`/consortia/${consortiumId}/environments`);
    return response.data;
  }

  async getEnvironment(consortiumId: string, environmentId: string): Promise<any> {
    let response = await this.api.get(
      `/consortia/${consortiumId}/environments/${environmentId}`
    );
    return response.data;
  }

  async createEnvironment(
    consortiumId: string,
    params: {
      name: string;
      description?: string;
      provider: string;
      consensus_type: string;
      mode?: string;
      block_period?: number;
      chain_id?: number;
    }
  ): Promise<any> {
    let response = await this.api.post(`/consortia/${consortiumId}/environments`, params);
    return response.data;
  }

  async updateEnvironment(
    consortiumId: string,
    environmentId: string,
    params: {
      name?: string;
      description?: string;
    }
  ): Promise<any> {
    let response = await this.api.patch(
      `/consortia/${consortiumId}/environments/${environmentId}`,
      params
    );
    return response.data;
  }

  async deleteEnvironment(consortiumId: string, environmentId: string): Promise<any> {
    let response = await this.api.delete(
      `/consortia/${consortiumId}/environments/${environmentId}`
    );
    return response.data;
  }

  // --- Nodes ---

  async listNodes(consortiumId: string, environmentId: string): Promise<any[]> {
    let response = await this.api.get(
      `/consortia/${consortiumId}/environments/${environmentId}/nodes`
    );
    return response.data;
  }

  async getNode(consortiumId: string, environmentId: string, nodeId: string): Promise<any> {
    let response = await this.api.get(
      `/consortia/${consortiumId}/environments/${environmentId}/nodes/${nodeId}`
    );
    return response.data;
  }

  async createNode(
    consortiumId: string,
    environmentId: string,
    params: {
      name: string;
      membership_id: string;
      role?: string;
      size?: string;
    }
  ): Promise<any> {
    let response = await this.api.post(
      `/consortia/${consortiumId}/environments/${environmentId}/nodes`,
      params
    );
    return response.data;
  }

  async updateNode(
    consortiumId: string,
    environmentId: string,
    nodeId: string,
    params: {
      name?: string;
      role?: string;
      size?: string;
    }
  ): Promise<any> {
    let response = await this.api.patch(
      `/consortia/${consortiumId}/environments/${environmentId}/nodes/${nodeId}`,
      params
    );
    return response.data;
  }

  async deleteNode(consortiumId: string, environmentId: string, nodeId: string): Promise<any> {
    let response = await this.api.delete(
      `/consortia/${consortiumId}/environments/${environmentId}/nodes/${nodeId}`
    );
    return response.data;
  }

  async performNodeAction(
    consortiumId: string,
    environmentId: string,
    nodeId: string,
    action: string
  ): Promise<any> {
    let response = await this.api.post(
      `/consortia/${consortiumId}/environments/${environmentId}/nodes/${nodeId}/${action}`
    );
    return response.data;
  }

  async getNodeStatus(
    consortiumId: string,
    environmentId: string,
    nodeId: string
  ): Promise<any> {
    let response = await this.api.get(
      `/consortia/${consortiumId}/environments/${environmentId}/nodes/${nodeId}/status`
    );
    return response.data;
  }

  async getNodeLogs(
    consortiumId: string,
    environmentId: string,
    nodeId: string
  ): Promise<any> {
    let response = await this.api.get(
      `/consortia/${consortiumId}/environments/${environmentId}/nodes/${nodeId}/logs`
    );
    return response.data;
  }

  // --- Services ---

  async listServices(consortiumId: string, environmentId: string): Promise<any[]> {
    let response = await this.api.get(
      `/consortia/${consortiumId}/environments/${environmentId}/services`
    );
    return response.data;
  }

  async getService(
    consortiumId: string,
    environmentId: string,
    serviceId: string
  ): Promise<any> {
    let response = await this.api.get(
      `/consortia/${consortiumId}/environments/${environmentId}/services/${serviceId}`
    );
    return response.data;
  }

  async createService(
    consortiumId: string,
    environmentId: string,
    params: {
      name: string;
      service: string;
      membership_id: string;
      size?: string;
    }
  ): Promise<any> {
    let response = await this.api.post(
      `/consortia/${consortiumId}/environments/${environmentId}/services`,
      params
    );
    return response.data;
  }

  async deleteService(
    consortiumId: string,
    environmentId: string,
    serviceId: string
  ): Promise<any> {
    let response = await this.api.delete(
      `/consortia/${consortiumId}/environments/${environmentId}/services/${serviceId}`
    );
    return response.data;
  }

  // --- Application Credentials ---

  async listAppCreds(consortiumId: string, environmentId: string): Promise<any[]> {
    let response = await this.api.get(
      `/consortia/${consortiumId}/environments/${environmentId}/appcreds`
    );
    return response.data;
  }

  async getAppCred(
    consortiumId: string,
    environmentId: string,
    appCredId: string
  ): Promise<any> {
    let response = await this.api.get(
      `/consortia/${consortiumId}/environments/${environmentId}/appcreds/${appCredId}`
    );
    return response.data;
  }

  async createAppCred(
    consortiumId: string,
    environmentId: string,
    params: {
      membership_id: string;
      name?: string;
    }
  ): Promise<any> {
    let response = await this.api.post(
      `/consortia/${consortiumId}/environments/${environmentId}/appcreds`,
      params
    );
    return response.data;
  }

  async deleteAppCred(
    consortiumId: string,
    environmentId: string,
    appCredId: string
  ): Promise<any> {
    let response = await this.api.delete(
      `/consortia/${consortiumId}/environments/${environmentId}/appcreds/${appCredId}`
    );
    return response.data;
  }

  // --- Compiled Contracts ---

  async listCompiledContracts(consortiumId: string, environmentId: string): Promise<any[]> {
    let response = await this.api.get(
      `/consortia/${consortiumId}/environments/${environmentId}/compiled_contracts`
    );
    return response.data;
  }

  async getCompiledContract(
    consortiumId: string,
    environmentId: string,
    contractId: string
  ): Promise<any> {
    let response = await this.api.get(
      `/consortia/${consortiumId}/environments/${environmentId}/compiled_contracts/${contractId}`
    );
    return response.data;
  }

  async createCompiledContract(
    consortiumId: string,
    environmentId: string,
    params: {
      name: string;
      description?: string;
      type?: string;
      source?: string;
      abi?: any;
      bytecode?: string;
      dev_docs?: string;
    }
  ): Promise<any> {
    let response = await this.api.post(
      `/consortia/${consortiumId}/environments/${environmentId}/compiled_contracts`,
      params
    );
    return response.data;
  }

  async promoteCompiledContract(
    consortiumId: string,
    environmentId: string,
    contractId: string
  ): Promise<any> {
    let response = await this.api.post(
      `/consortia/${consortiumId}/environments/${environmentId}/compiled_contracts/${contractId}/promote`
    );
    return response.data;
  }

  async deleteCompiledContract(
    consortiumId: string,
    environmentId: string,
    contractId: string
  ): Promise<any> {
    let response = await this.api.delete(
      `/consortia/${consortiumId}/environments/${environmentId}/compiled_contracts/${contractId}`
    );
    return response.data;
  }

  // --- Invitations ---

  async listInvitations(consortiumId: string): Promise<any[]> {
    let response = await this.api.get(`/consortia/${consortiumId}/invitations`);
    return response.data;
  }

  async createInvitation(
    consortiumId: string,
    params: {
      org_name: string;
      email: string;
    }
  ): Promise<any> {
    let response = await this.api.post(`/consortia/${consortiumId}/invitations`, params);
    return response.data;
  }

  async deleteInvitation(consortiumId: string, invitationId: string): Promise<any> {
    let response = await this.api.delete(
      `/consortia/${consortiumId}/invitations/${invitationId}`
    );
    return response.data;
  }

  // --- Audit Logs ---

  async listAuditLogs(params?: {
    consortiumId?: string;
    limit?: number;
    skip?: number;
  }): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.skip) queryParams.skip = params.skip;

    let path = params?.consortiumId ? `/consortia/${params.consortiumId}/audit` : '/audit';

    let response = await this.api.get(path, { params: queryParams });
    return response.data;
  }

  // --- Configurations ---

  async listConfigurations(consortiumId: string, environmentId: string): Promise<any[]> {
    let response = await this.api.get(
      `/consortia/${consortiumId}/environments/${environmentId}/configurations`
    );
    return response.data;
  }

  async getConfiguration(
    consortiumId: string,
    environmentId: string,
    configId: string
  ): Promise<any> {
    let response = await this.api.get(
      `/consortia/${consortiumId}/environments/${environmentId}/configurations/${configId}`
    );
    return response.data;
  }

  async createConfiguration(
    consortiumId: string,
    environmentId: string,
    params: {
      name: string;
      type: string;
      membership_id: string;
      details: Record<string, any>;
    }
  ): Promise<any> {
    let response = await this.api.post(
      `/consortia/${consortiumId}/environments/${environmentId}/configurations`,
      params
    );
    return response.data;
  }

  async deleteConfiguration(
    consortiumId: string,
    environmentId: string,
    configId: string
  ): Promise<any> {
    let response = await this.api.delete(
      `/consortia/${consortiumId}/environments/${environmentId}/configurations/${configId}`
    );
    return response.data;
  }
}
