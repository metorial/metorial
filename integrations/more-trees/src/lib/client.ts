import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';

let createMoreTreesHttp = (baseURL: string) =>
  createAuthenticatedAxios({
    baseURL,
    timeout: 30_000,
    headers: { Accept: 'application/json' },
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'More Trees',
        reason: 'more_trees_api_error'
      })
  });

let userManagementHttp = createMoreTreesHttp(
  'https://user-management-service.platform.moretrees.eco/user-management-api/external'
);

let projectManagementHttp = createMoreTreesHttp(
  'https://project-management-service.platform.moretrees.eco/project-management-api/external'
);

let transactionManagementHttp = createMoreTreesHttp(
  'https://transaction-management-service.platform.moretrees.eco/transaction-management-api/external'
);

let basicApiHttp = createMoreTreesHttp('https://api.moretrees.eco/v1/basic');

let accountResponse = z.object({
  account_name: z.string(),
  credit_balance: z.number(),
  forest_name: z.string(),
  forest_slug: z.string()
});

let forestResponse = z.object({
  forest_name: z.string(),
  logo_url: z.string(),
  brand_color: z.string(),
  totals: z.object({
    trees_planted: z.number(),
    trees_gifted: z.number(),
    trees_received: z.number(),
    co2_captured: z.number(),
    projects_supported: z.number()
  })
});

let projectsResponse = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    description: z.string(),
    country: z.string(),
    project_type: z.string(),
    supplier_name: z.string(),
    default: z.boolean(),
    project_image: z.string(),
    trees: z
      .array(
        z.object({
          id: z.number(),
          name: z.string(),
          description: z.string(),
          tonnes_c02: z.number(),
          credits_required: z.number(),
          default: z.boolean(),
          tree_image: z.string()
        })
      )
      .nullish()
  })
);

let plantResponse = z.object({
  test: z.boolean(),
  credits_used: z.number(),
  credits_remaining: z.number(),
  project_id: z.number(),
  tree_id: z.number()
});

let selfPlantResponse = plantResponse.extend({
  plant_for_others: z.boolean().nullish()
});

let giftPlantResponse = plantResponse.extend({
  recipients: z
    .array(
      z.object({
        account_code: z.string(),
        account_name: z.string(),
        quantity: z.number()
      })
    )
    .nullish()
});

let parseMoreTreesResponse = <T>(schema: z.ZodType<T>, data: unknown, operation: string) => {
  let result = schema.safeParse(data);
  if (!result.success) {
    throw createApiServiceError(`More Trees returned an unexpected ${operation} response.`, {
      reason: 'more_trees_invalid_response'
    });
  }
  return result.data;
};

export interface MoreTreesClientConfig {
  token: string;
  publicValidationKey: string;
}

export interface AccountInfo {
  accountName: string;
  creditBalance: number;
  forestName: string;
  forestSlug: string;
}

export interface ForestTotals {
  treesPlanted: number;
  treesGifted: number;
  treesReceived: number;
  co2Captured: number;
  projectsSupported: number;
}

export interface ForestInfo {
  forestName: string;
  logoUrl: string;
  brandColor: string;
  totals: ForestTotals;
}

export interface TreeInfo {
  treeId: number;
  name: string;
  description: string;
  tonnesCo2: number;
  creditsRequired: number;
  isDefault: boolean;
  treeImage: string;
}

export interface ProjectInfo {
  projectId: number;
  name: string;
  description: string;
  country: string;
  projectType: string;
  supplierName: string;
  isDefault: boolean;
  projectImage: string;
  trees: TreeInfo[];
}

export interface PlantRecipient {
  accountCode?: string;
  email?: string;
  name: string;
  quantity: number;
}

export interface PlantForSelfRequest {
  paymentAccountCode: string;
  quantity: number;
  projectId?: number;
  treeId?: number;
  test?: boolean;
}

export interface PlantForOthersRequest {
  paymentAccountCode: string;
  recipients: PlantRecipient[];
  projectId?: number;
  treeId?: number;
  test?: boolean;
}

export interface PlantResultRecipient {
  accountCode: string;
  accountName: string;
  quantity: number;
}

export interface PlantResult {
  test: boolean;
  plantForOthers: boolean;
  creditsUsed: number;
  creditsRemaining: number;
  projectId: number;
  treeId: number;
  recipients?: PlantResultRecipient[];
}

export class Client {
  private token: string;
  private publicValidationKey: string;

  constructor(config: MoreTreesClientConfig) {
    if (!config.token.trim() || !config.publicValidationKey.trim()) {
      throw createApiServiceError('Reconnect with your API Key and Public Validation Key.');
    }
    this.token = config.token;
    this.publicValidationKey = config.publicValidationKey;
  }

  private get apiKeyHeaders() {
    return {
      'X-API-KEY': this.token,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
  }

  private get publicHeaders() {
    return {
      Authorization: this.publicValidationKey,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
  }

  async getAccountInfo(accountCode: string): Promise<AccountInfo> {
    if (!accountCode.trim()) {
      throw createApiServiceError('Provide accountCode from Settings > Account Settings.');
    }
    let response = await userManagementHttp.get(
      `/accounts/${encodeURIComponent(accountCode.trim())}`,
      { headers: this.apiKeyHeaders }
    );

    let data = parseMoreTreesResponse(accountResponse, response.data, 'account information');
    return {
      accountName: data.account_name,
      creditBalance: data.credit_balance,
      forestName: data.forest_name,
      forestSlug: data.forest_slug
    };
  }

  async getForestInfo(forestSlugOrAccountCode: string): Promise<ForestInfo> {
    if (!forestSlugOrAccountCode.trim()) {
      throw createApiServiceError('Provide a forest slug or account code.');
    }
    let response = await userManagementHttp.get(
      `/forest/${encodeURIComponent(forestSlugOrAccountCode.trim())}`,
      { headers: this.apiKeyHeaders }
    );

    let data = parseMoreTreesResponse(forestResponse, response.data, 'forest information');
    return {
      forestName: data.forest_name,
      logoUrl: data.logo_url,
      brandColor: data.brand_color,
      totals: {
        treesPlanted: data.totals.trees_planted,
        treesGifted: data.totals.trees_gifted,
        treesReceived: data.totals.trees_received,
        co2Captured: data.totals.co2_captured,
        projectsSupported: data.totals.projects_supported
      }
    };
  }

  async getProjects(): Promise<ProjectInfo[]> {
    let response = await projectManagementHttp.get('/projects', {
      headers: this.publicHeaders
    });

    let data = parseMoreTreesResponse(projectsResponse, response.data, 'project list');
    return data.map(project => ({
      projectId: project.id,
      name: project.name,
      description: project.description,
      country: project.country,
      projectType: project.project_type,
      supplierName: project.supplier_name,
      isDefault: project.default,
      projectImage: project.project_image,
      trees: (project.trees || []).map(tree => ({
        treeId: tree.id,
        name: tree.name,
        description: tree.description,
        tonnesCo2: tree.tonnes_c02,
        creditsRequired: tree.credits_required,
        isDefault: tree.default,
        treeImage: tree.tree_image
      }))
    }));
  }

  async plantForSelf(request: PlantForSelfRequest): Promise<PlantResult> {
    let body = pickDefined({
      payment_account_code: request.paymentAccountCode,
      plant_for_others: false,
      quantity: request.quantity,
      project_id: request.projectId,
      tree_id: request.treeId,
      test: request.test
    });

    let response = await transactionManagementHttp.post('/plant', body, {
      headers: this.apiKeyHeaders
    });

    let data = parseMoreTreesResponse(selfPlantResponse, response.data, 'planting');
    return {
      test: data.test,
      plantForOthers: data.plant_for_others ?? false,
      creditsUsed: data.credits_used,
      creditsRemaining: data.credits_remaining,
      projectId: data.project_id,
      treeId: data.tree_id
    };
  }

  async plantForOthers(request: PlantForOthersRequest): Promise<PlantResult> {
    let body = pickDefined({
      payment_account_code: request.paymentAccountCode,
      plant_for_others: true,
      recipients: request.recipients.map(r =>
        pickDefined({
          name: r.name,
          quantity: r.quantity,
          account_code: r.accountCode?.trim() ? r.accountCode : undefined,
          email: r.email?.trim() ? r.email : undefined
        })
      ),
      project_id: request.projectId,
      tree_id: request.treeId,
      test: request.test
    });

    let response = await transactionManagementHttp.post('/plant', body, {
      headers: this.apiKeyHeaders
    });

    let data = parseMoreTreesResponse(giftPlantResponse, response.data, 'gifting');
    return {
      test: data.test,
      plantForOthers: true,
      creditsUsed: data.credits_used,
      creditsRemaining: data.credits_remaining,
      projectId: data.project_id,
      treeId: data.tree_id,
      recipients: (data.recipients || []).map(r => ({
        accountCode: r.account_code,
        accountName: r.account_name,
        quantity: r.quantity
      }))
    };
  }

  async viewCredits(): Promise<{ creditBalance: number }> {
    let response = await basicApiHttp.get('/viewCredits', {
      headers: this.publicHeaders
    });

    let data: unknown = response.data;
    let creditBalance = isApiErrorRecord(data) ? (data.credit_balance ?? data.credits) : data;
    if (typeof creditBalance !== 'number' || !Number.isFinite(creditBalance)) {
      throw createApiServiceError(
        'More Trees returned an unexpected credit balance response.'
      );
    }
    return {
      creditBalance
    };
  }

  async getCarbonOffset(): Promise<Record<string, unknown>> {
    let response = await basicApiHttp.get('/carbonOffset', {
      headers: this.publicHeaders
    });

    return parseMoreTreesResponse(
      z.record(z.string(), z.unknown()),
      response.data,
      'carbon offset'
    );
  }
}
