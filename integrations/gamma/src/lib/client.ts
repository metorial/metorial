import { createAxios } from 'slates';

let BASE_URL = 'https://public-api.gamma.app/v1.0';

export interface GenerateParams {
  inputText: string;
  textMode: 'generate' | 'condense' | 'preserve';
  format?: 'presentation' | 'document' | 'webpage' | 'social';
  themeId?: string;
  numCards?: number;
  cardSplit?: 'auto' | 'inputTextBreaks';
  additionalInstructions?: string;
  folderIds?: string[];
  exportAs?: 'pdf' | 'pptx';
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
  themeId?: string;
  folderIds?: string[];
  exportAs?: 'pdf' | 'pptx';
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
}

export interface GenerationStatus {
  generationId: string;
  status: 'pending' | 'completed' | 'failed';
  gammaUrl?: string;
  exportUrl?: string;
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
  nextCursor?: string;
}

export class GammaClient {
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'X-API-KEY': this.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async generate(params: GenerateParams): Promise<GenerationResponse> {
    let response = await this.axios.post('/generations', params);
    return response.data as GenerationResponse;
  }

  async generateFromTemplate(params: GenerateFromTemplateParams): Promise<GenerationResponse> {
    let response = await this.axios.post('/generations/from-template', params);
    return response.data as GenerationResponse;
  }

  async getGeneration(generationId: string): Promise<GenerationStatus> {
    let response = await this.axios.get(`/generations/${generationId}`);
    return response.data as GenerationStatus;
  }

  async listThemes(params?: {
    query?: string;
    limit?: number;
    after?: string;
  }): Promise<PaginatedResponse<Theme>> {
    let response = await this.axios.get('/themes', { params });
    return response.data as PaginatedResponse<Theme>;
  }

  async listFolders(params?: {
    query?: string;
    limit?: number;
    after?: string;
  }): Promise<PaginatedResponse<Folder>> {
    let response = await this.axios.get('/folders', { params });
    return response.data as PaginatedResponse<Folder>;
  }
}
