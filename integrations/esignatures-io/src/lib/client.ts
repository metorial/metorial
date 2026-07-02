import { createAxios } from 'slates';

let BASE_URL = 'https://esignatures.com/api';

export interface Signer {
  name: string;
  email?: string;
  mobile?: string;
  companyName?: string;
  signingOrder?: string;
  autoSign?: string;
  signatureRequestDeliveryMethods?: string[];
  signedDocumentDeliveryMethod?: string;
  multiFactorAuthentications?: string[];
  redirectUrl?: string;
}

export interface PlaceholderField {
  apiKey: string;
  value: string;
}

export interface SignerField {
  signerFieldId: string;
  defaultValue: string;
}

export interface ContractEmails {
  signatureRequestSubject?: string;
  signatureRequestText?: string;
  finalContractSubject?: string;
  finalContractText?: string;
  ccEmailAddresses?: string[];
  replyTo?: string;
}

export interface CustomBranding {
  companyName?: string;
  logoUrl?: string;
}

export interface CreateContractParams {
  templateId: string;
  signers: Signer[];
  title?: string;
  locale?: string;
  metadata?: string;
  expiresInHours?: string;
  customWebhookUrl?: string;
  assignedUserEmail?: string;
  labels?: string[];
  test?: string;
  saveAsDraft?: string;
  placeholderFields?: PlaceholderField[];
  signerFields?: SignerField[];
  emails?: ContractEmails;
  customBranding?: CustomBranding;
}

export interface DocumentElement {
  type: string;
  text?: string;
  textAlignment?: string;
  autoCounter?: string;
  depth?: number;
  textStyles?: Array<{ offset: number; length: number; style: string }>;
  signerFieldAssignedTo?: string;
  signerFieldRequired?: string;
  signerFieldId?: string;
  signerFieldDefaultValue?: string;
  signerFieldPlaceholderText?: string;
  signerFieldMasked?: string;
  signerFieldDropdownOptions?: string;
  imageBase64?: string;
  imageAlignment?: string;
  imageHeightRem?: number;
  imageDownloadEnabled?: string;
  tableCells?: Array<Array<{ text: string; styles?: string[]; alignment?: string }>>;
  templateId?: string;
}

export interface CreateTemplateParams {
  title: string;
  labels?: string[];
  documentElements: DocumentElement[];
}

export interface UpdateTemplateParams {
  title?: string;
  labels?: string[];
  documentElements?: DocumentElement[];
}

export interface CopyTemplateParams {
  title?: string;
  placeholderFields?: PlaceholderField[];
  targetApiKey?: string;
}

export interface UpdateSignerParams {
  name?: string;
  email?: string;
  mobile?: string;
  companyName?: string;
  signingOrder?: string;
  signatureRequestDeliveryMethods?: string[];
  signedDocumentDeliveryMethod?: string;
  multiFactorAuthentications?: string[];
  redirectUrl?: string;
}

let toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

let convertKeysToSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnakeCase);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: any, key: string) => {
      let snakeKey = toSnakeCase(key);
      acc[snakeKey] = convertKeysToSnakeCase(obj[key]);
      return acc;
    }, {});
  }
  return obj;
};

let toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

let convertKeysToCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamelCase);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: any, key: string) => {
      let camelKey = toCamelCase(key);
      acc[camelKey] = convertKeysToCamelCase(obj[key]);
      return acc;
    }, {});
  }
  return obj;
};

export class Client {
  private token: string;
  private http;

  constructor(config: { token: string }) {
    this.token = config.token;
    this.http = createAxios({
      baseURL: BASE_URL
    });
  }

  // --- Contracts ---

  async createContract(params: CreateContractParams): Promise<any> {
    let body = convertKeysToSnakeCase(params);
    let response = await this.http.post('/contracts', body, {
      params: { token: this.token }
    });
    return convertKeysToCamelCase(response.data);
  }

  async queryContract(contractId: string): Promise<any> {
    let response = await this.http.get(`/contracts/${contractId}`, {
      params: { token: this.token }
    });
    return convertKeysToCamelCase(response.data);
  }

  async withdrawContract(contractId: string): Promise<any> {
    let response = await this.http.post(
      `/contracts/${contractId}/withdraw`,
      {},
      {
        params: { token: this.token }
      }
    );
    return convertKeysToCamelCase(response.data);
  }

  async generatePdfPreview(contractId: string): Promise<any> {
    let response = await this.http.post(
      `/contracts/${contractId}/generate_pdf_preview`,
      {},
      {
        params: { token: this.token }
      }
    );
    return convertKeysToCamelCase(response.data);
  }

  // --- Signers ---

  async addSigner(contractId: string, signer: Signer): Promise<any> {
    let body = convertKeysToSnakeCase(signer);
    let response = await this.http.post(`/contracts/${contractId}/signers`, body, {
      params: { token: this.token }
    });
    return convertKeysToCamelCase(response.data);
  }

  async updateSigner(
    contractId: string,
    signerId: string,
    params: UpdateSignerParams
  ): Promise<any> {
    let body = convertKeysToSnakeCase(params);
    let response = await this.http.post(`/contracts/${contractId}/signers/${signerId}`, body, {
      params: { token: this.token }
    });
    return convertKeysToCamelCase(response.data);
  }

  async sendContract(contractId: string, signerId: string): Promise<any> {
    let response = await this.http.post(
      `/contracts/${contractId}/signers/${signerId}/send_contract`,
      {},
      {
        params: { token: this.token }
      }
    );
    return convertKeysToCamelCase(response.data);
  }

  async deleteSigner(contractId: string, signerId: string): Promise<any> {
    let response = await this.http.post(
      `/contracts/${contractId}/signers/${signerId}/delete`,
      {},
      {
        params: { token: this.token }
      }
    );
    return convertKeysToCamelCase(response.data);
  }

  // --- Templates ---

  async createTemplate(params: CreateTemplateParams): Promise<any> {
    let body = convertKeysToSnakeCase(params);
    let response = await this.http.post('/templates', body, {
      params: { token: this.token }
    });
    return convertKeysToCamelCase(response.data);
  }

  async updateTemplate(templateId: string, params: UpdateTemplateParams): Promise<any> {
    let body = convertKeysToSnakeCase(params);
    let response = await this.http.post(`/templates/${templateId}`, body, {
      params: { token: this.token }
    });
    return convertKeysToCamelCase(response.data);
  }

  async copyTemplate(templateId: string, params: CopyTemplateParams): Promise<any> {
    let body = convertKeysToSnakeCase(params);
    let response = await this.http.post(`/templates/${templateId}/copy`, body, {
      params: { token: this.token }
    });
    return convertKeysToCamelCase(response.data);
  }

  async queryTemplate(templateId: string): Promise<any> {
    let response = await this.http.get(`/templates/${templateId}`, {
      params: { token: this.token }
    });
    return convertKeysToCamelCase(response.data);
  }

  async listTemplates(): Promise<any> {
    let response = await this.http.get('/templates', {
      params: { token: this.token }
    });
    return convertKeysToCamelCase(response.data);
  }

  async deleteTemplate(templateId: string): Promise<any> {
    let response = await this.http.post(
      `/templates/${templateId}/delete`,
      {},
      {
        params: { token: this.token }
      }
    );
    return convertKeysToCamelCase(response.data);
  }

  // --- Template Collaborators ---

  async addCollaborator(templateId: string, name: string): Promise<any> {
    let response = await this.http.post(
      `/templates/${templateId}/collaborators`,
      { name },
      {
        params: { token: this.token }
      }
    );
    return convertKeysToCamelCase(response.data);
  }

  async listCollaborators(templateId: string): Promise<any> {
    let response = await this.http.get(`/templates/${templateId}/collaborators`, {
      params: { token: this.token }
    });
    return convertKeysToCamelCase(response.data);
  }

  async removeCollaborator(templateId: string, collaboratorId: string): Promise<any> {
    let response = await this.http.post(
      `/templates/${templateId}/collaborators/${collaboratorId}/remove`,
      {},
      {
        params: { token: this.token }
      }
    );
    return convertKeysToCamelCase(response.data);
  }
}
