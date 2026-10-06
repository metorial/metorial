import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  pickDefined
} from 'slates';
import { z } from 'zod';

const id = z.string().min(1);
const scaleToZero = z.object({ enabled: z.boolean(), inactivityPeriodMinutes: z.number() });
const configuration = z.object({
  region: z.string(),
  instanceType: z.string(),
  image: z.string(),
  replicas: z.number(),
  storage: z.number().optional()
});
const organization = z.object({
  id,
  name: z.string(),
  status: z.object({
    status: z.string(),
    disabled_by_admin: z.boolean(),
    billing_status: z.string(),
    usage_tier: z.string(),
    last_updated: z.string()
  })
});
const project = z.object({
  id,
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  configuration: z.object({
    scaleToZero: z.object({ baseBranches: scaleToZero, childBranches: scaleToZero })
  })
});
const branch = z.object({
  id,
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  parentID: z.string().nullish(),
  region: z.string(),
  publicAccess: z.boolean(),
  backupsEnabled: z.boolean().optional(),
  status: z
    .object({
      status: z.string(),
      statusType: z.string(),
      instanceCount: z.number(),
      instanceReadyCount: z.number()
    })
    .optional(),
  scaleToZero: scaleToZero.optional(),
  configuration: configuration.optional()
});
export type Branch = z.infer<typeof branch>;
export type BranchUpdate = {
  name?: string;
  description?: string;
  hibernate?: boolean;
  scaleToZero?: { enabled: boolean; inactivityPeriodMinutes: number };
};
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError(
      'Xata returned an invalid current-platform response. Check the selected resource or try again.'
    );
  return result.data;
};
const pathId = (value: string) => {
  if (!/^[a-zA-Z0-9_~:-]+$/.test(value) || value === '.' || value === '..')
    throw createApiServiceError(
      'Provide a valid current Xata organization, project or branch ID.'
    );
  return encodeURIComponent(value);
};
export const resolveOrganization = (
  input: string | undefined,
  configured: string | undefined
) => {
  const value = input ?? configured;
  if (!value)
    throw createApiServiceError(
      'Provide organizationId or configure it using an ID returned by list_organizations. Legacy workspaceId does not identify a current organization.'
    );
  pathId(value);
  return value;
};
const validateName = (value: string | undefined) => {
  if (value !== undefined && !value.trim())
    throw createApiServiceError('Provide a non-empty branch name.');
};
const validateDescription = (value: string | undefined) => {
  if (
    value !== undefined &&
    (value.length > 255 || !/^([a-zA-Z0-9][a-zA-Z0-9\-_./: ]*)?$/.test(value))
  )
    throw createApiServiceError(
      'Branch descriptions must start with a letter or digit and use letters, digits, spaces, hyphens, underscores, dots, slashes or colons; maximum 255 characters. Use an empty string to clear it.'
    );
};
export class XataPlatformClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(config: { token: string }) {
    if (!config.token.trim() || /[\r\n]/.test(config.token))
      throw createApiServiceError('Provide a current Xata API key from the Xata console.');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.xata.tech',
      authHeader: { value: `Bearer ${config.token}` },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Xata',
          reason: 'xata_platform_api_error',
          formatMessage: ({ status }) =>
            `Xata request failed${status ? ` (HTTP ${status})` : ''}. Check the current API key, organization role, org/project/branch scopes and resource state.`,
          parent: createApiServiceError('Xata upstream request failed.', {
            upstreamStatus: getApiErrorStatus(error)
          })
        })
    });
  }
  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    schema: z.ZodType<T>,
    data?: Record<string, unknown>
  ) {
    const response = await this.http.request<unknown>({ method, url: path, data });
    return parse(schema, response.data);
  }
  private projectPath(organizationId: string, projectId: string) {
    return `/organizations/${pathId(organizationId)}/projects/${pathId(projectId)}`;
  }
  private branchPath(organizationId: string, projectId: string, branchId: string) {
    return `${this.projectPath(organizationId, projectId)}/branches/${pathId(branchId)}`;
  }
  async listOrganizations() {
    return this.request(
      'GET',
      '/organizations',
      z.object({ organizations: z.array(organization) })
    );
  }
  async listProjects(organizationId: string) {
    return this.request(
      'GET',
      `/organizations/${pathId(organizationId)}/projects`,
      z.object({ projects: z.array(project) })
    );
  }
  async getProject(organizationId: string, projectId: string) {
    const value = await this.request(
      'GET',
      this.projectPath(organizationId, projectId),
      project
    );
    if (value.id !== projectId)
      throw createApiServiceError(
        'Xata returned a different project ID. Check the selected project.'
      );
    return value;
  }
  async listBranches(organizationId: string, projectId: string) {
    return this.request(
      'GET',
      `${this.projectPath(organizationId, projectId)}/branches`,
      z.object({ branches: z.array(branch) })
    );
  }
  async getBranch(organizationId: string, projectId: string, branchId: string) {
    const value = await this.request(
      'GET',
      this.branchPath(organizationId, projectId, branchId),
      branch.required({
        status: true,
        scaleToZero: true,
        configuration: true,
        backupsEnabled: true
      })
    );
    if (value.id !== branchId)
      throw createApiServiceError(
        'Xata returned a different branch ID. Check the selected branch.'
      );
    return value;
  }
  async createBranch(
    organizationId: string,
    projectId: string,
    params: { name: string; parentBranchId: string; description?: string }
  ) {
    validateName(params.name);
    validateDescription(params.description);
    pathId(params.parentBranchId);
    const value = await this.request(
      'POST',
      `${this.projectPath(organizationId, projectId)}/branches`,
      branch,
      pickDefined({
        name: params.name,
        description: params.description,
        mode: 'inherit',
        parentID: params.parentBranchId
      })
    );
    if (
      value.name !== params.name ||
      (value.parentID !== undefined && value.parentID !== params.parentBranchId)
    )
      throw createApiServiceError(
        'Xata returned a different branch name or parent. Inspect the project for the requested branch before retrying creation.'
      );
    return value;
  }
  async updateBranch(
    organizationId: string,
    projectId: string,
    branchId: string,
    attributes: BranchUpdate
  ) {
    if (!Object.values(attributes).some(value => value !== undefined))
      throw createApiServiceError('Provide at least one branch field to update.');
    validateName(attributes.name);
    validateDescription(attributes.description);
    if (
      attributes.scaleToZero &&
      (!Number.isSafeInteger(attributes.scaleToZero.inactivityPeriodMinutes) ||
        attributes.scaleToZero.inactivityPeriodMinutes < 1)
    )
      throw createApiServiceError('Use a positive integer inactivityPeriodMinutes.');
    if (attributes.hibernate === true && attributes.scaleToZero?.enabled === true)
      throw createApiServiceError(
        'Manual hibernation and automatic scale-to-zero cannot be enabled together. Disable scale-to-zero before manually hibernating the branch.'
      );
    const value = await this.request(
      'PATCH',
      this.branchPath(organizationId, projectId, branchId),
      branch,
      pickDefined(attributes)
    );
    if (value.id !== branchId)
      throw createApiServiceError(
        'Xata returned a different branch ID after update. Inspect the requested branch before retrying.'
      );
    return value;
  }
  async deleteBranch(organizationId: string, projectId: string, branchId: string) {
    const response = await this.http.delete<unknown>(
      this.branchPath(organizationId, projectId, branchId)
    );
    if (response.status !== 204)
      throw createApiServiceError(
        'Xata returned an unexpected deletion response. Inspect the branch before retrying deletion.'
      );
  }
}
