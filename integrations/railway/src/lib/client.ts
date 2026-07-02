import { createAxios } from 'slates';

let httpClient = createAxios({
  baseURL: 'https://backboard.railway.com/graphql/v2'
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private async graphql<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    let response = await httpClient.post(
      '',
      {
        query,
        variables
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.errors && response.data.errors.length > 0) {
      let errorMessage = response.data.errors.map((e: any) => e.message).join(', ');
      throw new Error(`GraphQL error: ${errorMessage}`);
    }

    return response.data.data as T;
  }

  // ─── User ───

  async getMe(): Promise<{ id: string; name: string; email: string }> {
    let data = await this.graphql<{ me: { id: string; name: string; email: string } }>(
      `query { me { id name email } }`
    );
    return data.me;
  }

  // ─── Projects ───

  async listProjects(workspaceId?: string): Promise<any[]> {
    let query = workspaceId
      ? `query($workspaceId: String!) { projects(workspaceId: $workspaceId) { edges { node { id name description createdAt updatedAt } } } }`
      : `query { projects { edges { node { id name description createdAt updatedAt } } } }`;

    let data = await this.graphql<{ projects: { edges: { node: any }[] } }>(
      query,
      workspaceId ? { workspaceId } : undefined
    );
    return data.projects.edges.map(e => e.node);
  }

  async getProject(projectId: string): Promise<any> {
    let data = await this.graphql<{ project: any }>(
      `
      query($id: String!) {
        project(id: $id) {
          id name description createdAt updatedAt
          services { edges { node { id name icon createdAt projectId } } }
          environments { edges { node { id name createdAt } } }
        }
      }
    `,
      { id: projectId }
    );
    return {
      ...data.project,
      services: data.project.services.edges.map((e: any) => e.node),
      environments: data.project.environments.edges.map((e: any) => e.node)
    };
  }

  async createProject(input: {
    name: string;
    description?: string;
    workspaceId?: string;
  }): Promise<any> {
    let data = await this.graphql<{ projectCreate: any }>(
      `
      mutation($input: ProjectCreateInput!) {
        projectCreate(input: $input) { id name description createdAt }
      }
    `,
      { input }
    );
    return data.projectCreate;
  }

  async updateProject(
    projectId: string,
    input: { name?: string; description?: string; isPublic?: boolean; prDeploys?: boolean }
  ): Promise<any> {
    let data = await this.graphql<{ projectUpdate: any }>(
      `
      mutation($id: String!, $input: ProjectUpdateInput!) {
        projectUpdate(id: $id, input: $input) { id name description }
      }
    `,
      { id: projectId, input }
    );
    return data.projectUpdate;
  }

  async deleteProject(projectId: string): Promise<boolean> {
    await this.graphql(
      `
      mutation($id: String!) { projectDelete(id: $id) }
    `,
      { id: projectId }
    );
    return true;
  }

  // ─── Services ───

  async getService(serviceId: string): Promise<any> {
    let data = await this.graphql<{ service: any }>(
      `
      query($id: String!) {
        service(id: $id) { id name icon createdAt projectId }
      }
    `,
      { id: serviceId }
    );
    return data.service;
  }

  async getServiceInstance(serviceId: string, environmentId: string): Promise<any> {
    let data = await this.graphql<{ serviceInstance: any }>(
      `
      query($serviceId: String!, $environmentId: String!) {
        serviceInstance(serviceId: $serviceId, environmentId: $environmentId) {
          id serviceName startCommand buildCommand rootDirectory
          healthcheckPath region numReplicas
          restartPolicyType restartPolicyMaxRetries
          latestDeployment { id status createdAt }
        }
      }
    `,
      { serviceId, environmentId }
    );
    return data.serviceInstance;
  }

  async createService(input: {
    projectId: string;
    name?: string;
    source?: { repo?: string; image?: string };
  }): Promise<any> {
    let data = await this.graphql<{ serviceCreate: any }>(
      `
      mutation($input: ServiceCreateInput!) {
        serviceCreate(input: $input) { id name icon createdAt projectId }
      }
    `,
      { input }
    );
    return data.serviceCreate;
  }

  async updateService(
    serviceId: string,
    input: { name?: string; icon?: string }
  ): Promise<any> {
    let data = await this.graphql<{ serviceUpdate: any }>(
      `
      mutation($id: String!, $input: ServiceUpdateInput!) {
        serviceUpdate(id: $id, input: $input) { id name icon }
      }
    `,
      { id: serviceId, input }
    );
    return data.serviceUpdate;
  }

  async updateServiceInstance(
    serviceId: string,
    environmentId: string,
    input: {
      startCommand?: string;
      buildCommand?: string;
      rootDirectory?: string;
      healthcheckPath?: string;
      numReplicas?: number;
      region?: string;
      cronSchedule?: string;
    }
  ): Promise<boolean> {
    await this.graphql(
      `
      mutation($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
        serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
      }
    `,
      { serviceId, environmentId, input }
    );
    return true;
  }

  async deleteService(serviceId: string): Promise<boolean> {
    await this.graphql(
      `
      mutation($id: String!) { serviceDelete(id: $id) }
    `,
      { id: serviceId }
    );
    return true;
  }

  async redeployService(serviceId: string, environmentId: string): Promise<boolean> {
    await this.graphql(
      `
      mutation($serviceId: String!, $environmentId: String!) {
        serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
      }
    `,
      { serviceId, environmentId }
    );
    return true;
  }

  // ─── Deployments ───

  async listDeployments(
    input: { projectId?: string; serviceId?: string; environmentId?: string },
    first: number = 10
  ): Promise<any[]> {
    let data = await this.graphql<{ deployments: { edges: { node: any }[] } }>(
      `
      query($input: DeploymentListInput!, $first: Int) {
        deployments(input: $input, first: $first) {
          edges { node { id status createdAt url staticUrl } }
        }
      }
    `,
      { input, first }
    );
    return data.deployments.edges.map(e => e.node);
  }

  async getDeployment(deploymentId: string): Promise<any> {
    let data = await this.graphql<{ deployment: any }>(
      `
      query($id: String!) {
        deployment(id: $id) {
          id status createdAt url staticUrl
          canRedeploy canRollback
          meta
        }
      }
    `,
      { id: deploymentId }
    );
    return data.deployment;
  }

  async redeployDeployment(deploymentId: string): Promise<any> {
    let data = await this.graphql<{ deploymentRedeploy: any }>(
      `
      mutation($id: String!) {
        deploymentRedeploy(id: $id) { id status }
      }
    `,
      { id: deploymentId }
    );
    return data.deploymentRedeploy;
  }

  async rollbackDeployment(deploymentId: string): Promise<any> {
    let data = await this.graphql<{ deploymentRollback: any }>(
      `
      mutation($id: String!) {
        deploymentRollback(id: $id) { id status }
      }
    `,
      { id: deploymentId }
    );
    return data.deploymentRollback;
  }

  async cancelDeployment(deploymentId: string): Promise<boolean> {
    await this.graphql(
      `
      mutation($id: String!) { deploymentCancel(id: $id) }
    `,
      { id: deploymentId }
    );
    return true;
  }

  async removeDeployment(deploymentId: string): Promise<boolean> {
    await this.graphql(
      `
      mutation($id: String!) { deploymentRemove(id: $id) }
    `,
      { id: deploymentId }
    );
    return true;
  }

  async restartDeployment(deploymentId: string): Promise<boolean> {
    await this.graphql(
      `
      mutation($id: String!) { deploymentRestart(id: $id) }
    `,
      { id: deploymentId }
    );
    return true;
  }

  async getBuildLogs(deploymentId: string, limit: number = 100): Promise<any[]> {
    let data = await this.graphql<{ buildLogs: any[] }>(
      `
      query($deploymentId: String!, $limit: Int) {
        buildLogs(deploymentId: $deploymentId, limit: $limit) {
          timestamp message severity
        }
      }
    `,
      { deploymentId, limit }
    );
    return data.buildLogs;
  }

  async getDeploymentLogs(deploymentId: string, limit: number = 100): Promise<any[]> {
    let data = await this.graphql<{ deploymentLogs: any[] }>(
      `
      query($deploymentId: String!, $limit: Int) {
        deploymentLogs(deploymentId: $deploymentId, limit: $limit) {
          timestamp message severity
        }
      }
    `,
      { deploymentId, limit }
    );
    return data.deploymentLogs;
  }

  // ─── Environments ───

  async listEnvironments(projectId: string): Promise<any[]> {
    let data = await this.graphql<{ environments: { edges: { node: any }[] } }>(
      `
      query($projectId: String!) {
        environments(projectId: $projectId) {
          edges { node { id name createdAt } }
        }
      }
    `,
      { projectId }
    );
    return data.environments.edges.map(e => e.node);
  }

  async getEnvironment(environmentId: string): Promise<any> {
    let data = await this.graphql<{ environment: any }>(
      `
      query($id: String!) {
        environment(id: $id) {
          id name createdAt
          serviceInstances { edges { node { id serviceName latestDeployment { id status } } } }
        }
      }
    `,
      { id: environmentId }
    );
    return {
      ...data.environment,
      serviceInstances: data.environment.serviceInstances.edges.map((e: any) => e.node)
    };
  }

  async createEnvironment(input: {
    projectId: string;
    name: string;
    sourceEnvironmentId?: string;
  }): Promise<any> {
    let data = await this.graphql<{ environmentCreate: any }>(
      `
      mutation($input: EnvironmentCreateInput!) {
        environmentCreate(input: $input) { id name createdAt }
      }
    `,
      { input }
    );
    return data.environmentCreate;
  }

  async deleteEnvironment(environmentId: string): Promise<boolean> {
    await this.graphql(
      `
      mutation($id: String!) { environmentDelete(id: $id) }
    `,
      { id: environmentId }
    );
    return true;
  }

  // ─── Variables ───

  async getVariables(
    projectId: string,
    environmentId: string,
    serviceId?: string
  ): Promise<Record<string, string>> {
    let data = await this.graphql<{ variables: Record<string, string> }>(
      `
      query($projectId: String!, $environmentId: String!, $serviceId: String) {
        variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
      }
    `,
      { projectId, environmentId, serviceId }
    );
    return data.variables;
  }

  async upsertVariable(input: {
    projectId: string;
    environmentId: string;
    serviceId: string;
    name: string;
    value: string;
  }): Promise<boolean> {
    await this.graphql(
      `
      mutation($input: VariableUpsertInput!) { variableUpsert(input: $input) }
    `,
      { input }
    );
    return true;
  }

  async upsertVariables(input: {
    projectId: string;
    environmentId: string;
    serviceId: string;
    variables: Record<string, string>;
    replace?: boolean;
  }): Promise<boolean> {
    await this.graphql(
      `
      mutation($input: VariableCollectionUpsertInput!) { variableCollectionUpsert(input: $input) }
    `,
      { input }
    );
    return true;
  }

  async deleteVariable(input: {
    projectId: string;
    environmentId: string;
    serviceId: string;
    name: string;
  }): Promise<boolean> {
    await this.graphql(
      `
      mutation($input: VariableDeleteInput!) { variableDelete(input: $input) }
    `,
      { input }
    );
    return true;
  }

  // ─── Domains ───

  async getDomains(
    projectId: string,
    environmentId: string,
    serviceId: string
  ): Promise<{
    serviceDomains: any[];
    customDomains: any[];
  }> {
    let data = await this.graphql<{ domains: any }>(
      `
      query($projectId: String!, $environmentId: String!, $serviceId: String!) {
        domains(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId) {
          serviceDomains { id domain suffix targetPort }
          customDomains {
            id domain
            status { dnsRecords { hostlabel requiredValue currentValue status } }
          }
        }
      }
    `,
      { projectId, environmentId, serviceId }
    );
    return data.domains;
  }

  async createServiceDomain(input: {
    serviceId: string;
    environmentId: string;
    targetPort?: number;
  }): Promise<any> {
    let data = await this.graphql<{ serviceDomainCreate: any }>(
      `
      mutation($input: ServiceDomainCreateInput!) {
        serviceDomainCreate(input: $input) { id domain }
      }
    `,
      { input }
    );
    return data.serviceDomainCreate;
  }

  async deleteServiceDomain(domainId: string): Promise<boolean> {
    await this.graphql(
      `
      mutation($id: String!) { serviceDomainDelete(id: $id) }
    `,
      { id: domainId }
    );
    return true;
  }

  async createCustomDomain(input: {
    projectId: string;
    environmentId: string;
    serviceId: string;
    domain: string;
    targetPort?: number;
  }): Promise<any> {
    let data = await this.graphql<{ customDomainCreate: any }>(
      `
      mutation($input: CustomDomainCreateInput!) {
        customDomainCreate(input: $input) {
          id domain
          status { dnsRecords { hostlabel requiredValue status } }
        }
      }
    `,
      { input }
    );
    return data.customDomainCreate;
  }

  async deleteCustomDomain(domainId: string): Promise<boolean> {
    await this.graphql(
      `
      mutation($id: String!) { customDomainDelete(id: $id) }
    `,
      { id: domainId }
    );
    return true;
  }

  // ─── Volumes ───

  async listVolumes(projectId: string): Promise<any[]> {
    let data = await this.graphql<{ project: { volumes: { edges: { node: any }[] } } }>(
      `
      query($id: String!) {
        project(id: $id) {
          volumes { edges { node { id name createdAt } } }
        }
      }
    `,
      { id: projectId }
    );
    return data.project.volumes.edges.map(e => e.node);
  }

  async createVolume(input: {
    projectId: string;
    serviceId: string;
    mountPath: string;
    environmentId?: string;
  }): Promise<any> {
    let data = await this.graphql<{ volumeCreate: any }>(
      `
      mutation($input: VolumeCreateInput!) {
        volumeCreate(input: $input) { id name }
      }
    `,
      { input }
    );
    return data.volumeCreate;
  }

  async updateVolume(volumeId: string, input: { name?: string }): Promise<any> {
    let data = await this.graphql<{ volumeUpdate: any }>(
      `
      mutation($volumeId: String!, $input: VolumeUpdateInput!) {
        volumeUpdate(volumeId: $volumeId, input: $input) { id name }
      }
    `,
      { volumeId, input }
    );
    return data.volumeUpdate;
  }

  async deleteVolume(volumeId: string): Promise<boolean> {
    await this.graphql(
      `
      mutation($volumeId: String!) { volumeDelete(volumeId: $volumeId) }
    `,
      { volumeId }
    );
    return true;
  }

  // ─── TCP Proxies ───

  async getTcpProxies(serviceId: string, environmentId: string): Promise<any[]> {
    let data = await this.graphql<{ tcpProxies: any[] }>(
      `
      query($serviceId: String!, $environmentId: String!) {
        tcpProxies(serviceId: $serviceId, environmentId: $environmentId) {
          id domain proxyPort applicationPort
        }
      }
    `,
      { serviceId, environmentId }
    );
    return data.tcpProxies;
  }
}
