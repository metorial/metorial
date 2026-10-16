import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';
import { z } from 'zod';

let repositorySchema = z
  .object({
    scm_type: z.string().optional(),
    url: z.string().optional(),
    branch: z.string().optional(),
    cached: z.boolean().optional()
  })
  .passthrough()
  .nullable()
  .optional();
let projectSchema = z
  .object({
    name: z.string(),
    permalink: z.string(),
    zone: z.string().optional(),
    zone_id: z.number().optional(),
    public_key: z.string().optional(),
    last_deployed_at: z.string().nullable().optional(),
    auto_deploy_url: z.string().optional(),
    repository: repositorySchema
  })
  .passthrough();
let serverSchema = z
  .object({
    identifier: z.string(),
    name: z.string(),
    protocol_type: z.string(),
    server_path: z.string().optional(),
    hostname: z.string().optional(),
    port: z.union([z.string(), z.number()]).optional(),
    username: z.string().optional(),
    preferred_branch: z.string().optional(),
    last_revision: z.string().nullable().optional(),
    auto_deploy: z.boolean().optional(),
    auto_deploy_url: z.string().optional(),
    environment: z.string().optional(),
    server_group_identifier: z.string().nullable().optional()
  })
  .passthrough();
let revisionSchema = z
  .object({
    ref: z.string().optional(),
    message: z.string().optional(),
    author: z.string().optional()
  })
  .passthrough()
  .nullable()
  .optional();
let deploymentSchema = z
  .object({
    identifier: z.string(),
    status: z.string(),
    deployer: z.string().nullable().optional(),
    branch: z.string().optional(),
    start_revision: revisionSchema,
    end_revision: revisionSchema,
    timestamps: z
      .object({
        queued_at: z.string().optional(),
        started_at: z.string().nullable().optional(),
        completed_at: z.string().nullable().optional(),
        duration: z.union([z.string(), z.number()]).nullable().optional()
      })
      .passthrough()
      .optional(),
    configuration: z
      .object({ copy_config_files: z.boolean().optional() })
      .passthrough()
      .optional()
  })
  .passthrough();
let targetSchema = z.object({ identifier: z.string(), name: z.string() }).passthrough();
let configFileSchema = z
  .object({
    identifier: z.string(),
    path: z.string(),
    body: z.string(),
    servers: z.array(targetSchema).optional()
  })
  .passthrough();
let commandSchema = z
  .object({
    identifier: z.string(),
    description: z.string(),
    command: z.string(),
    cback: z.string(),
    timing: z.string(),
    halt_on_error: z.boolean(),
    servers: z.array(targetSchema).optional()
  })
  .passthrough();
let groupSchema = z
  .object({ identifier: z.string(), name: z.string(), servers: z.array(serverSchema) })
  .passthrough();
let scheduledSchema = z
  .object({
    identifier: z.string(),
    frequency: z.string(),
    at: z
      .object({ hour: z.number().optional(), minute: z.number().optional() })
      .passthrough()
      .optional(),
    server: z
      .object({
        identifier: z.string().optional(),
        name: z.string().optional(),
        protocol_type: z.string().optional()
      })
      .passthrough()
      .optional(),
    start_revision: z.string().optional(),
    end_revision: z.string().optional(),
    copy_config_files: z.boolean().optional(),
    run_build_commands: z.boolean().optional(),
    next_deployment_at: z.string().optional()
  })
  .passthrough();
let deletionSchema = z.object({ status: z.string() }).passthrough();

export let validateResponse = <T>(value: unknown, schema: z.ZodType<T>): T => {
  let parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw createApiServiceError('DeployHQ returned an invalid response.', {
      reason: 'invalid_response'
    });
  }
  return parsed.data;
};

export let validateInteger = (
  value: number | undefined,
  name: string,
  min: number,
  max = Number.MAX_SAFE_INTEGER
) => {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < min || value > max)) {
    throw createApiServiceError(`${name} must be an integer between ${min} and ${max}.`);
  }
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: {
    token: string;
    email: string;
    accountName: string;
  }) {
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(params.accountName)) {
      throw createApiServiceError(
        'Enter the DeployHQ account subdomain without a URL or domain suffix.'
      );
    }
    this.axios = createAxios({
      baseURL: `https://${params.accountName}.deployhq.com`,
      auth: {
        username: params.email,
        password: params.token
      },
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
    this.axios.interceptors.response.use(
      response => response,
      error => {
        throw buildApiServiceError(error, {
          providerLabel: 'DeployHQ',
          reason: 'deployhq_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          detailKeys: ['message', 'error', 'hint', 'status'],
          extractUpstreamCode: (_error, response) => {
            let body = response?.data;
            return body &&
              typeof body === 'object' &&
              'error_code' in body &&
              typeof body.error_code === 'string'
              ? body.error_code
              : undefined;
          },
          extractMessage: (input, helpers) => {
            let body = helpers.getResponseWithBody(input)?.data;
            if (!helpers.isRecord(body)) return undefined;
            let details: string[] = [];
            helpers.collectDetails(body, details, {
              detailKeys: ['error', 'message', 'hint'],
              nestedKeys: ['errors']
            });
            for (let [field, value] of Object.entries(body)) {
              if (Array.isArray(value)) {
                let messages = value.filter(
                  (item): item is string => typeof item === 'string'
                );
                if (messages.length) details.push(`${field}: ${messages.join(', ')}`);
              }
            }
            return details.length ? details.join('; ') : undefined;
          }
        });
      }
    );
  }

  // ── Projects ──────────────────────────────────────────────

  async listProjects(): Promise<any[]> {
    let response = await this.axios.get('/projects');
    return validateResponse(response.data, z.array(projectSchema));
  }

  async getProject(projectPermalink: string): Promise<any> {
    let response = await this.axios.get(`/projects/${encodeURIComponent(projectPermalink)}`);
    return validateResponse(response.data, projectSchema);
  }

  async createProject(data: {
    name: string;
    zoneId?: number;
    zoneIdentifier?: string;
  }): Promise<any> {
    let response = await this.axios.post('/projects', {
      project: {
        name: data.name,
        ...(data.zoneIdentifier !== undefined
          ? { zone_id: data.zoneIdentifier }
          : data.zoneId !== undefined
            ? { zone_id: data.zoneId }
            : {})
      }
    });
    return validateResponse(response.data, projectSchema);
  }

  async updateProject(projectPermalink: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/projects/${encodeURIComponent(projectPermalink)}`, {
      project: data
    });
    return validateResponse(response.data, projectSchema);
  }

  async deleteProject(projectPermalink: string): Promise<any> {
    let response = await this.axios.delete(
      `/projects/${encodeURIComponent(projectPermalink)}`
    );
    return validateResponse(response.data, deletionSchema);
  }

  // ── Servers ───────────────────────────────────────────────

  async listServers(projectPermalink: string): Promise<any[]> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(projectPermalink)}/servers`
    );
    return validateResponse(response.data, z.array(serverSchema));
  }

  async getServer(projectPermalink: string, serverIdentifier: string): Promise<any> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(projectPermalink)}/servers/${encodeURIComponent(serverIdentifier)}`
    );
    return validateResponse(response.data, serverSchema);
  }

  async createServer(projectPermalink: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/projects/${encodeURIComponent(projectPermalink)}/servers`,
      {
        server: data
      }
    );
    return validateResponse(response.data, serverSchema);
  }

  async updateServer(
    projectPermalink: string,
    serverIdentifier: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(
      `/projects/${encodeURIComponent(projectPermalink)}/servers/${encodeURIComponent(serverIdentifier)}`,
      {
        server: data
      }
    );
    return validateResponse(response.data, serverSchema);
  }

  async deleteServer(projectPermalink: string, serverIdentifier: string): Promise<any> {
    let response = await this.axios.delete(
      `/projects/${encodeURIComponent(projectPermalink)}/servers/${encodeURIComponent(serverIdentifier)}`
    );
    return validateResponse(response.data, deletionSchema);
  }

  // ── Server Groups ─────────────────────────────────────────

  async listServerGroups(projectPermalink: string): Promise<any[]> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(projectPermalink)}/server_groups`
    );
    return validateResponse(response.data, z.array(groupSchema));
  }

  async getServerGroup(projectPermalink: string, groupIdentifier: string): Promise<any> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(projectPermalink)}/server_groups/${encodeURIComponent(groupIdentifier)}`
    );
    return validateResponse(response.data, groupSchema);
  }

  async createServerGroup(projectPermalink: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/projects/${encodeURIComponent(projectPermalink)}/server_groups`,
      {
        server_group: data
      }
    );
    return validateResponse(response.data, groupSchema);
  }

  async deleteServerGroup(projectPermalink: string, groupIdentifier: string): Promise<any> {
    let response = await this.axios.delete(
      `/projects/${encodeURIComponent(projectPermalink)}/server_groups/${encodeURIComponent(groupIdentifier)}`
    );
    return validateResponse(response.data, deletionSchema);
  }

  // ── Deployments ───────────────────────────────────────────

  async listDeployments(
    projectPermalink: string,
    params: Record<string, unknown> = {}
  ): Promise<any> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(projectPermalink)}/deployments`,
      { params }
    );
    return validateResponse(
      response.data,
      z
        .object({
          records: z.array(deploymentSchema),
          pagination: z
            .object({
              current_page: z.number().optional(),
              total_pages: z.number().optional(),
              total_records: z.number().optional()
            })
            .passthrough()
            .optional()
        })
        .passthrough()
    );
  }

  async getDeployment(projectPermalink: string, deploymentIdentifier: string): Promise<any> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(projectPermalink)}/deployments/${encodeURIComponent(deploymentIdentifier)}`
    );
    return validateResponse(response.data, deploymentSchema);
  }

  async createDeployment(
    projectPermalink: string,
    data: Record<string, any>,
    schedule?: Record<string, unknown>
  ): Promise<any> {
    let response = await this.axios.post(
      `/projects/${encodeURIComponent(projectPermalink)}/deployments`,
      {
        deployment: data,
        ...(schedule ? { schedule } : {})
      }
    );
    return validateResponse(response.data, deploymentSchema);
  }

  // ── Scheduled Deployments ─────────────────────────────────

  async listScheduledDeployments(projectPermalink: string): Promise<any[]> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(projectPermalink)}/scheduled_deployments`
    );
    return validateResponse(response.data, z.array(scheduledSchema));
  }

  async deleteScheduledDeployment(projectPermalink: string, identifier: string): Promise<any> {
    let response = await this.axios.delete(
      `/projects/${encodeURIComponent(projectPermalink)}/scheduled_deployments/${encodeURIComponent(identifier)}`
    );
    return validateResponse(response.data, deletionSchema);
  }

  // ── Config Files ──────────────────────────────────────────

  async listConfigFiles(projectPermalink: string): Promise<any[]> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(projectPermalink)}/config_files`
    );
    return validateResponse(response.data, z.array(configFileSchema));
  }

  async getConfigFile(projectPermalink: string, configFileIdentifier: string): Promise<any> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(projectPermalink)}/config_files/${encodeURIComponent(configFileIdentifier)}`
    );
    return validateResponse(response.data, configFileSchema);
  }

  async createConfigFile(projectPermalink: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/projects/${encodeURIComponent(projectPermalink)}/config_files`,
      {
        config_file: data
      }
    );
    return validateResponse(response.data, configFileSchema);
  }

  async updateConfigFile(
    projectPermalink: string,
    configFileIdentifier: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(
      `/projects/${encodeURIComponent(projectPermalink)}/config_files/${encodeURIComponent(configFileIdentifier)}`,
      {
        config_file: data
      }
    );
    return validateResponse(response.data, configFileSchema);
  }

  async deleteConfigFile(
    projectPermalink: string,
    configFileIdentifier: string
  ): Promise<any> {
    let response = await this.axios.delete(
      `/projects/${encodeURIComponent(projectPermalink)}/config_files/${encodeURIComponent(configFileIdentifier)}`
    );
    return validateResponse(response.data, deletionSchema);
  }

  // ── SSH Commands ──────────────────────────────────────────

  async listCommands(projectPermalink: string): Promise<any[]> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(projectPermalink)}/commands`
    );
    return validateResponse(response.data, z.array(commandSchema));
  }

  async getCommand(projectPermalink: string, commandIdentifier: string): Promise<any> {
    let response = await this.axios.get(
      `/projects/${encodeURIComponent(projectPermalink)}/commands/${encodeURIComponent(commandIdentifier)}`
    );
    return validateResponse(response.data, commandSchema);
  }

  async createCommand(projectPermalink: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/projects/${encodeURIComponent(projectPermalink)}/commands`,
      {
        command: data
      }
    );
    return validateResponse(response.data, commandSchema);
  }

  async updateCommand(
    projectPermalink: string,
    commandIdentifier: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(
      `/projects/${encodeURIComponent(projectPermalink)}/commands/${encodeURIComponent(commandIdentifier)}`,
      {
        command: data
      }
    );
    return validateResponse(response.data, commandSchema);
  }

  async deleteCommand(projectPermalink: string, commandIdentifier: string): Promise<any> {
    let response = await this.axios.delete(
      `/projects/${encodeURIComponent(projectPermalink)}/commands/${encodeURIComponent(commandIdentifier)}`
    );
    return validateResponse(response.data, deletionSchema);
  }
  async getProfile(): Promise<any> {
    let response = await this.axios.get('/profile');
    return validateResponse(
      response.data,
      z.object({ email_address: z.string() }).passthrough()
    );
  }

  async listZones(): Promise<any[]> {
    let response = await this.axios.get('/zones');
    return validateResponse(
      response.data,
      z.array(z.object({ identifier: z.string(), description: z.string() }).passthrough())
    );
  }

  async manageDeployment(
    projectPermalink: string,
    identifier: string,
    action: 'retry' | 'rollback' | 'abort'
  ): Promise<any> {
    let response = await this.axios.post(
      `/projects/${encodeURIComponent(projectPermalink)}/deployments/${encodeURIComponent(identifier)}/${action}`
    );
    return validateResponse(
      response.data,
      action === 'abort' ? deletionSchema : deploymentSchema
    );
  }
}
