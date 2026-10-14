import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let regionBaseUrls: Record<string, string> = {
  us: 'https://console.kaleido.io/api/v1',
  eu: 'https://console-eu.kaleido.io/api/v1',
  ap: 'https://console-ap.kaleido.io/api/v1',
  ko: 'https://console-ko.kaleido.io/api/v1',
  us1: 'https://console-us1.kaleido.io/api/v1',
  eu1: 'https://console-eu1.kaleido.io/api/v1'
};

export class KaleidoClient {
  private api: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; region: string }) {
    let baseURL = regionBaseUrls[config.region];
    if (!baseURL) {
      throw createApiServiceError('Select a supported Kaleido deployment region.', {
        reason: 'invalid_region'
      });
    }
    if (!config.token.trim()) {
      throw createApiServiceError('Provide a Kaleido API key.', { reason: 'missing_auth' });
    }

    this.api = createAuthenticatedAxios({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${config.token.trim()}`
      },
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Kaleido',
          reason: 'kaleido_api_error',
          detailKeys: ['errorMessage', 'message', 'error', 'detail', 'code']
        })
    });
  }

  // --- Consortia ---

  async listConsortia(): Promise<any[]> {
    let response = await this.api.get('/consortia');
    return response.data;
  }

  async getConsortium(consortiumId: string): Promise<any> {
    let response = await this.api.get(`/consortia/${encodeURIComponent(consortiumId)}`);
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
    let response = await this.api.patch(
      `/consortia/${encodeURIComponent(consortiumId)}`,
      params
    );
    return response.data;
  }

  async deleteConsortium(consortiumId: string): Promise<any> {
    let response = await this.api.delete(`/consortia/${encodeURIComponent(consortiumId)}`);
    return response.data;
  }

  // --- Memberships ---

  async listMemberships(consortiumId: string): Promise<any[]> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/memberships`
    );
    return response.data;
  }

  async getMembership(consortiumId: string, membershipId: string): Promise<any> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/memberships/${encodeURIComponent(membershipId)}`
    );
    return response.data;
  }

  async createMembership(consortiumId: string, params: { org_name: string }): Promise<any> {
    let response = await this.api.post(
      `/consortia/${encodeURIComponent(consortiumId)}/memberships`,
      params
    );
    return response.data;
  }

  async deleteMembership(consortiumId: string, membershipId: string): Promise<any> {
    let response = await this.api.delete(
      `/consortia/${encodeURIComponent(consortiumId)}/memberships/${encodeURIComponent(membershipId)}`
    );
    return response.data;
  }

  // --- Environments ---

  async listEnvironments(consortiumId: string): Promise<any[]> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/environments`
    );
    return response.data;
  }

  async getEnvironment(consortiumId: string, environmentId: string): Promise<any> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}`
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
    let response = await this.api.post(
      `/consortia/${encodeURIComponent(consortiumId)}/environments`,
      params
    );
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
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}`,
      params
    );
    return response.data;
  }

  async deleteEnvironment(consortiumId: string, environmentId: string): Promise<any> {
    let response = await this.api.delete(
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}`
    );
    return response.data;
  }

  // --- Nodes ---

  async listNodes(consortiumId: string, environmentId: string): Promise<any[]> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/nodes`
    );
    return response.data;
  }

  async getNode(consortiumId: string, environmentId: string, nodeId: string): Promise<any> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/nodes/${encodeURIComponent(nodeId)}`
    );
    return response.data;
  }

  async createNode(
    consortiumId: string,
    environmentId: string,
    params: {
      name: string;
      membership_id: string;
      init_consensus_role?: string;
      size?: string;
    }
  ): Promise<any> {
    let response = await this.api.post(
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/nodes`,
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
      size?: string;
    }
  ): Promise<any> {
    let response = await this.api.patch(
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/nodes/${encodeURIComponent(nodeId)}`,
      params
    );
    return response.data;
  }

  async deleteNode(consortiumId: string, environmentId: string, nodeId: string): Promise<any> {
    let response = await this.api.delete(
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/nodes/${encodeURIComponent(nodeId)}`
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
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/nodes/${encodeURIComponent(nodeId)}/${encodeURIComponent(action)}`,
      {}
    );
    return response.data;
  }

  async getNodeStatus(
    consortiumId: string,
    environmentId: string,
    nodeId: string
  ): Promise<any> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/nodes/${encodeURIComponent(nodeId)}/status`
    );
    return response.data;
  }

  async getNodeLogs(
    consortiumId: string,
    environmentId: string,
    nodeId: string,
    logType: string,
    params?: { maxlines?: number; frompos?: number }
  ): Promise<any> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/nodes/${encodeURIComponent(nodeId)}/logs/${encodeURIComponent(logType)}`,
      { params }
    );
    return response.data;
  }

  // --- Services ---

  async listServices(consortiumId: string, environmentId: string): Promise<any[]> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/services`
    );
    return response.data;
  }

  async getService(
    consortiumId: string,
    environmentId: string,
    serviceId: string
  ): Promise<any> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/services/${encodeURIComponent(serviceId)}`
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
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/services`,
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
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/services/${encodeURIComponent(serviceId)}`
    );
    return response.data;
  }

  // --- Application Credentials ---

  async listAppCreds(consortiumId: string, environmentId: string): Promise<any[]> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/appcreds`
    );
    return response.data;
  }

  async getAppCred(
    consortiumId: string,
    environmentId: string,
    appCredId: string
  ): Promise<any> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/appcreds/${encodeURIComponent(appCredId)}`
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
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/appcreds`,
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
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/appcreds/${encodeURIComponent(appCredId)}`
    );
    return response.data;
  }

  // Contract projects own compiled versions; promotion targets an environment.

  async listContractProjects(consortiumId: string): Promise<any[]> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/contracts`
    );
    return response.data;
  }

  async getContractProject(consortiumId: string, projectId: string): Promise<any> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/contracts/${encodeURIComponent(projectId)}`
    );
    return response.data;
  }

  async createContractProject(
    consortiumId: string,
    params: {
      name: string;
      description?: string;
      membership_id: string;
      type: string;
    }
  ): Promise<any> {
    let response = await this.api.post(
      `/consortia/${encodeURIComponent(consortiumId)}/contracts`,
      params
    );
    return response.data;
  }

  async updateContractProject(
    consortiumId: string,
    projectId: string,
    params: {
      name?: string;
      description?: string;
    }
  ): Promise<any> {
    let response = await this.api.patch(
      `/consortia/${encodeURIComponent(consortiumId)}/contracts/${encodeURIComponent(projectId)}`,
      params
    );
    return response.data;
  }

  async deleteContractProject(consortiumId: string, projectId: string): Promise<any> {
    let response = await this.api.delete(
      `/consortia/${encodeURIComponent(consortiumId)}/contracts/${encodeURIComponent(projectId)}`
    );
    return response.data;
  }

  async listCompiledContracts(consortiumId: string, projectId: string): Promise<any[]> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/contracts/${encodeURIComponent(projectId)}/compiled_contracts`
    );
    return response.data;
  }

  async getCompiledContract(
    consortiumId: string,
    projectId: string,
    contractId: string
  ): Promise<any> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/contracts/${encodeURIComponent(projectId)}/compiled_contracts/${encodeURIComponent(contractId)}`
    );
    return response.data;
  }

  async createCompiledContract(
    consortiumId: string,
    projectId: string,
    params: {
      description: string;
      membership_id: string;
      contract_url?: string;
      contract_name?: string;
      abi?: string;
      bytecode?: string;
    }
  ): Promise<any> {
    let response = await this.api.post(
      `/consortia/${encodeURIComponent(consortiumId)}/contracts/${encodeURIComponent(projectId)}/compiled_contracts`,
      params
    );
    return response.data;
  }

  async promoteCompiledContract(
    consortiumId: string,
    projectId: string,
    contractId: string,
    params: {
      environment_id: string;
      endpoint?: string;
    }
  ): Promise<any> {
    let response = await this.api.post(
      `/consortia/${encodeURIComponent(consortiumId)}/contracts/${encodeURIComponent(projectId)}/compiled_contracts/${encodeURIComponent(contractId)}/promote`,
      params
    );
    return response.data;
  }

  async deleteCompiledContract(
    consortiumId: string,
    projectId: string,
    contractId: string
  ): Promise<any> {
    let response = await this.api.delete(
      `/consortia/${encodeURIComponent(consortiumId)}/contracts/${encodeURIComponent(projectId)}/compiled_contracts/${encodeURIComponent(contractId)}`
    );
    return response.data;
  }

  async listOrganizations(): Promise<any[]> {
    let response = await this.api.get('/orgs');
    return response.data;
  }

  // --- Invitations ---

  async listInvitations(consortiumId: string): Promise<any[]> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/invitations`
    );
    return response.data;
  }

  async createInvitation(
    consortiumId: string,
    params: {
      org_name: string;
      email: string;
    }
  ): Promise<any> {
    let response = await this.api.post(
      `/consortia/${encodeURIComponent(consortiumId)}/invitations`,
      params
    );
    return response.data;
  }

  async deleteInvitation(consortiumId: string, invitationId: string): Promise<any> {
    let response = await this.api.delete(
      `/consortia/${encodeURIComponent(consortiumId)}/invitations/${encodeURIComponent(invitationId)}`
    );
    return response.data;
  }

  // --- Audit Logs ---

  async listAuditLogs(params?: {
    consortiumId?: string;
    limit?: number;
    skip?: number;
  }): Promise<any[]> {
    let path = params?.consortiumId
      ? `/audit/${encodeURIComponent(params.consortiumId)}`
      : '/audit';

    let response = await this.api.get(path);
    if (!Array.isArray(response.data)) {
      throw createApiServiceError('Kaleido returned an unexpected audit log response.', {
        reason: 'invalid_response'
      });
    }
    let skip = params?.skip ?? 0;
    return response.data.slice(
      skip,
      params?.limit === undefined ? undefined : skip + params.limit
    );
  }

  // --- Configurations ---

  async listConfigurations(consortiumId: string, environmentId: string): Promise<any[]> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/configurations`
    );
    return response.data;
  }

  async getConfiguration(
    consortiumId: string,
    environmentId: string,
    configId: string
  ): Promise<any> {
    let response = await this.api.get(
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/configurations/${encodeURIComponent(configId)}`
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
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/configurations`,
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
      `/consortia/${encodeURIComponent(consortiumId)}/environments/${encodeURIComponent(environmentId)}/configurations/${encodeURIComponent(configId)}`
    );
    return response.data;
  }
}
