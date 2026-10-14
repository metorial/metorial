import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

let BASE_URL = 'https://public-api.gamma.app/v1.0';

export interface GenerateParams {
  inputText: string;
  textMode?: 'generate' | 'condense' | 'preserve';
  title?: string;
  format?: 'presentation' | 'document' | 'webpage' | 'social';
  themeId?: string;
  numCards?: number;
  cardSplit?: 'auto' | 'inputTextBreaks';
  additionalInstructions?: string;
  folderId?: string;
  folderIds?: string[];
  exportAs?: 'pdf' | 'pptx' | 'png';
  textOptions?: {
    amount?: 'brief' | 'medium' | 'detailed' | 'extensive';
    tone?: string;
    audience?: string;
    language?: string;
  };
  imageOptions?: {
    source?:
      | 'aiGenerated'
      | 'pictographic'
      | 'pexels'
      | 'giphy'
      | 'webAllImages'
      | 'webFreeToUse'
      | 'webFreeToUseCommercially'
      | 'themeAccent'
      | 'placeholder'
      | 'noImages';
    model?: string;
    style?: string;
  };
  cardOptions?: {
    dimensions?: string;
    headerFooter?: HeaderFooterConfig;
  };
  sharingOptions?: {
    workspaceAccess?: 'noAccess' | 'view' | 'comment' | 'edit' | 'fullAccess';
    externalAccess?: 'noAccess' | 'view' | 'comment' | 'edit';
    emailOptions?: {
      recipients?: string[];
      access?: 'view' | 'comment' | 'edit' | 'fullAccess';
    };
  };
}

export interface HeaderFooterPosition {
  type: 'text' | 'image' | 'cardNumber';
  value?: string;
  source?: string;
  src?: string;
  size?: string;
}

export interface HeaderFooterConfig {
  topLeft?: HeaderFooterPosition;
  topCenter?: HeaderFooterPosition;
  topRight?: HeaderFooterPosition;
  bottomLeft?: HeaderFooterPosition;
  bottomCenter?: HeaderFooterPosition;
  bottomRight?: HeaderFooterPosition;
  hideFromFirstCard?: boolean;
  hideFromLastCard?: boolean;
}

export interface GenerateFromTemplateParams {
  gammaId: string;
  prompt: string;
  title?: string;
  themeId?: string;
  folderId?: string;
  folderIds?: string[];
  exportAs?: 'pdf' | 'pptx' | 'png';
  imageOptions?: {
    model?: string;
    style?: string;
  };
  sharingOptions?: {
    workspaceAccess?: 'noAccess' | 'view' | 'comment' | 'edit' | 'fullAccess';
    externalAccess?: 'noAccess' | 'view' | 'comment' | 'edit';
    emailOptions?: {
      recipients?: string[];
      access?: 'view' | 'comment' | 'edit' | 'fullAccess';
    };
  };
}

export interface GenerationResponse {
  generationId: string;
  warnings?: string | null;
}

export interface GenerationStatus {
  generationId: string;
  status: 'pending' | 'completed' | 'failed';
  gammaId?: string | null;
  gammaUrl?: string | null;
  exportUrl?: string | null;
  credits?: {
    deducted: number;
    remaining: number;
  };
  error?: {
    message: string;
    statusCode: number;
  };
}

export interface Theme {
  id: string;
  name: string;
  type: string;
  colorKeywords?: string[];
  toneKeywords?: string[];
}

export interface Folder {
  id: string;
  name: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string | null;
}

export interface GammaSearchHit {
  id: string;
  title: string | null;
  url: string;
  highlight: string | null;
  createdBy: string | null;
  updatedTime: string | null;
  archived: boolean;
}

export interface WorkspaceTemplateSearchHit {
  id: string;
  title: string | null;
  url: string;
  previewUrl: string | null;
}

export interface ExploreTemplateSearchHit extends WorkspaceTemplateSearchHit {
  thumbnailUrl: string | null;
}

export interface GammaMetadata {
  id: string;
  title: string;
  type: 'regular' | 'template';
  url: string;
  thumbnailUrl: string | null;
  description: string | null;
  author: { name: string; avatarUrl: string | null } | null;
  createdTime: string | null;
  updatedTime: string | null;
  themeId: string | null;
  archived: boolean;
}

let gammaError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Gamma',
    reason: 'gamma_api_error',
    operation
  });

let validateGenerationOptions = (params: GenerateParams | GenerateFromTemplateParams) => {
  if (!params.folderId && (params.folderIds?.length ?? 0) > 1) {
    throw createApiServiceError(
      'Gamma accepts only one folder. Use folderId from list_folders, or at most one entry in folderIds.'
    );
  }
  if (params.sharingOptions?.emailOptions) {
    let recipients = params.sharingOptions.emailOptions.recipients;
    if (!recipients?.length || recipients.some(email => !z.email().safeParse(email).success)) {
      throw createApiServiceError(
        'emailOptions requires at least one valid email address in recipients.'
      );
    }
  }
};

let validateHeaderFooter = (params: GenerateParams) => {
  let headerFooter = params.cardOptions?.headerFooter;
  if (!headerFooter) return;
  if (params.format === 'webpage') {
    throw createApiServiceError('Headers and footers are not supported for webpage format.');
  }
  for (let position of [
    'topLeft',
    'topCenter',
    'topRight',
    'bottomLeft',
    'bottomCenter',
    'bottomRight'
  ] as const) {
    let element = headerFooter[position];
    if (!element) continue;
    if (element.type === 'text' && !element.value?.trim()) {
      throw createApiServiceError(
        `Header/footer ${position} requires value for text elements.`
      );
    }
    if (element.type === 'image') {
      if (element.source !== 'themeLogo' && element.source !== 'custom') {
        throw createApiServiceError(
          `Header/footer ${position} image source must be themeLogo or custom.`
        );
      }
      if (element.source === 'custom' && !element.src) {
        throw createApiServiceError(
          `Header/footer ${position} requires src for a custom image.`
        );
      }
      if (element.size && !['sm', 'md', 'lg', 'xl'].includes(element.size)) {
        throw createApiServiceError(
          `Header/footer ${position} image size must be sm, md, lg, or xl.`
        );
      }
    }
  }
};

export class GammaClient {
  private axios;

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError(
        'A Gamma API key is required. Reconnect with a valid API key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { name: 'X-API-KEY', value: token.trim() },
      timeout: 60_000
    });
  }

  async generate(params: GenerateParams): Promise<GenerationResponse> {
    validateGenerationOptions(params);
    validateHeaderFooter(params);
    return requestAxiosData<GenerationResponse>(
      'generate content',
      () =>
        this.axios.post('/generations', {
          ...params,
          folderIds: params.folderId ? undefined : params.folderIds
        }),
      gammaError
    );
  }

  async generateFromTemplate(params: GenerateFromTemplateParams): Promise<GenerationResponse> {
    validateGenerationOptions(params);
    return requestAxiosData<GenerationResponse>(
      'generate from template',
      () =>
        this.axios.post('/generations/from-template', {
          ...params,
          folderIds: params.folderId ? undefined : params.folderIds
        }),
      gammaError
    );
  }

  async getGeneration(generationId: string): Promise<GenerationStatus> {
    return requestAxiosData<GenerationStatus>(
      'get generation status',
      () => this.axios.get(`/generations/${encodeURIComponent(generationId)}`),
      gammaError
    );
  }

  async listThemes(params?: {
    query?: string;
    limit?: number;
    after?: string;
    type?: 'standard' | 'custom';
  }): Promise<PaginatedResponse<Theme>> {
    return requestAxiosData<PaginatedResponse<Theme>>(
      'list themes',
      () => this.axios.get('/themes', { params }),
      gammaError
    );
  }

  async listFolders(params?: {
    query?: string;
    limit?: number;
    after?: string;
  }): Promise<PaginatedResponse<Folder>> {
    return requestAxiosData<PaginatedResponse<Folder>>(
      'list folders',
      () => this.axios.get('/folders', { params }),
      gammaError
    );
  }

  async searchGammas(params: {
    q?: string;
    createdBy?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    includeArchived?: boolean;
    limit?: number;
  }): Promise<{ hits: GammaSearchHit[] }> {
    if (
      !params.q?.trim() &&
      !params.createdBy?.trim() &&
      !params.updatedAfter &&
      !params.updatedBefore
    ) {
      throw createApiServiceError(
        'Provide query, createdBy, updatedAfter, or updatedBefore to search gammas.'
      );
    }
    return requestAxiosData<{ hits: GammaSearchHit[] }>(
      'search gammas',
      () => this.axios.get('/gammas/search', { params }),
      gammaError
    );
  }

  async searchTemplates(params: { q?: string; limit?: number }): Promise<{
    workspaceTemplates: WorkspaceTemplateSearchHit[];
    exploreTemplates: ExploreTemplateSearchHit[];
    workspaceDegraded?: boolean;
  }> {
    return requestAxiosData(
      'search templates',
      () => this.axios.get('/templates/search', { params }),
      gammaError
    );
  }

  async getGamma(gammaId: string): Promise<GammaMetadata> {
    return requestAxiosData<GammaMetadata>(
      'get gamma',
      () => this.axios.get(`/gammas/${encodeURIComponent(gammaId)}`),
      gammaError
    );
  }
}
