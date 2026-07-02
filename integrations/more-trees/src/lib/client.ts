import { createAxios } from 'slates';

let userManagementHttp = createAxios({
  baseURL:
    'https://user-management-service.platform.moretrees.eco/user-management-api/external'
});

let projectManagementHttp = createAxios({
  baseURL:
    'https://project-management-service.platform.moretrees.eco/project-management-api/external'
});

let transactionManagementHttp = createAxios({
  baseURL:
    'https://transaction-management-service.platform.moretrees.eco/transaction-management-api/external'
});

let basicApiHttp = createAxios({
  baseURL: 'https://api.moretrees.eco/v1/basic'
});

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
    let response = await userManagementHttp.get(`/accounts/${accountCode}`, {
      headers: this.apiKeyHeaders
    });

    let data = response.data;
    return {
      accountName: data.account_name,
      creditBalance: data.credit_balance,
      forestName: data.forest_name,
      forestSlug: data.forest_slug
    };
  }

  async getForestInfo(forestSlugOrAccountCode: string): Promise<ForestInfo> {
    let response = await userManagementHttp.get(`/forest/${forestSlugOrAccountCode}`, {
      headers: this.apiKeyHeaders
    });

    let data = response.data;
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

    let data = response.data as any[];
    return data.map((project: any) => ({
      projectId: project.id,
      name: project.name,
      description: project.description,
      country: project.country,
      projectType: project.project_type,
      supplierName: project.supplier_name,
      isDefault: project.default,
      projectImage: project.project_image,
      trees: (project.trees || []).map((tree: any) => ({
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
    let body: Record<string, any> = {
      payment_account_code: request.paymentAccountCode,
      plant_for_others: false,
      quantity: request.quantity
    };

    if (request.projectId !== undefined) body.project_id = request.projectId;
    if (request.treeId !== undefined) body.tree_id = request.treeId;
    if (request.test !== undefined) body.test = request.test;

    let response = await transactionManagementHttp.post('/plant', body, {
      headers: this.apiKeyHeaders
    });

    let data = response.data;
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
    let body: Record<string, any> = {
      payment_account_code: request.paymentAccountCode,
      plant_for_others: true,
      recipients: request.recipients.map(r => {
        let recipient: Record<string, any> = {
          name: r.name,
          quantity: r.quantity
        };
        if (r.accountCode) recipient.account_code = r.accountCode;
        if (r.email) recipient.email = r.email;
        return recipient;
      })
    };

    if (request.projectId !== undefined) body.project_id = request.projectId;
    if (request.treeId !== undefined) body.tree_id = request.treeId;
    if (request.test !== undefined) body.test = request.test;

    let response = await transactionManagementHttp.post('/plant', body, {
      headers: this.apiKeyHeaders
    });

    let data = response.data;
    return {
      test: data.test,
      plantForOthers: true,
      creditsUsed: data.credits_used,
      creditsRemaining: data.credits_remaining,
      projectId: data.project_id,
      treeId: data.tree_id,
      recipients: (data.recipients || []).map((r: any) => ({
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

    let data = response.data;
    return {
      creditBalance: data.credit_balance ?? data.credits ?? data
    };
  }

  async getCarbonOffset(): Promise<Record<string, any>> {
    let response = await basicApiHttp.get('/carbonOffset', {
      headers: this.publicHeaders
    });

    return response.data;
  }
}
