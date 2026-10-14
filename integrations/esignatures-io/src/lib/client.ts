import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

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
  documentElements?: DocumentElement[];
  markdown?: string;
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

let optionalString = z
  .string()
  .nullish()
  .transform(value => value ?? undefined);
let signerSchema = z.object({
  id: z.string().min(1),
  name: optionalString,
  email: optionalString,
  mobile: optionalString,
  companyName: optionalString,
  signPageUrl: optionalString,
  signerFieldValues: z
    .record(z.string(), z.unknown())
    .nullish()
    .transform(value => value ?? undefined)
});
let contractResponseSchema = z.object({
  status: optionalString,
  data: z.object({
    contract: z.object({
      id: z.string().min(1),
      status: optionalString,
      title: optionalString,
      metadata: optionalString,
      source: optionalString,
      test: optionalString,
      contractPdfUrl: optionalString,
      labels: z
        .array(z.string())
        .nullish()
        .transform(value => value ?? undefined),
      signers: z
        .array(signerSchema)
        .nullish()
        .transform(value => value ?? [])
    })
  })
});
let templateSchema = z.object({
  templateId: z.string().min(1),
  title: optionalString,
  createdAt: optionalString,
  placeholderFields: z
    .array(z.string())
    .nullish()
    .transform(value => value ?? undefined),
  signerFieldIds: z
    .array(z.string())
    .nullish()
    .transform(value => value ?? undefined),
  documentElements: z
    .array(z.unknown())
    .nullish()
    .transform(value => value ?? undefined)
});
let templateResponseSchema = z.object({ data: templateSchema });
let templateListResponseSchema = z.object({ data: z.array(templateSchema) });
let templateCreatedResponseSchema = z.object({
  data: z.tuple([templateSchema]).rest(templateSchema)
});
let statusResponseSchema = z.object({
  status: z.string(),
  data: z.object({ signer: signerSchema.optional() }).optional()
});
let collaboratorsResponseSchema = z.object({
  data: z.array(
    z.object({
      templateCollaboratorId: z.string().min(1),
      templateId: optionalString,
      name: optionalString,
      email: optionalString,
      templateCollaboratorEditorUrl: optionalString
    })
  )
});
let contentResponseSchema = z.object({
  data: z.object({
    markdown: z.string(),
    contractId: optionalString,
    templateId: optionalString
  })
});
let contentUpdateResponseSchema = z.object({
  status: z.string(),
  data: z.object({ markdown: z.string() })
});

let convertKeys = (value: unknown, direction: 'snake' | 'camel'): unknown => {
  if (Array.isArray(value)) return value.map(item => convertKeys(item, direction));
  if (!isApiErrorRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      let convertedKey =
        direction === 'snake'
          ? key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
          : key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
      // Signer-field IDs belong to the template author and must remain unchanged.
      return [
        convertedKey,
        direction === 'camel' && key === 'signer_field_values'
          ? item
          : convertKeys(item, direction)
      ];
    })
  );
};

let mapPlaceholderFields = (fields: PlaceholderField[] | undefined) =>
  fields?.map(field => ({
    placeholder_key: field.apiKey,
    replace_with_text: field.value
  }));

let mapSigner = (signer: Signer | UpdateSignerParams) => ({
  ...signer,
  signedDocumentDeliveryMethod:
    signer.signedDocumentDeliveryMethod === 'no_delivery'
      ? ''
      : signer.signedDocumentDeliveryMethod
});

export type DocumentResource = 'contract' | 'template';
export interface ContentEdit {
  findMarkdown: string;
  replaceWithMarkdown: string;
}

export class Client {
  private http;

  constructor(config: { token: string }) {
    if (!config.token.trim())
      throw createApiServiceError('An eSignatures.io secret token is required.');
    this.http = createAuthenticatedAxios({
      baseURL: BASE_URL,
      auth: { username: config.token, password: '' },
      timeout: 30000
    });
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    schema: z.ZodType<T>,
    body?: unknown
  ): Promise<T> {
    let raw = await requestAxiosData<unknown>(
      `${method} ${path}`,
      () => this.http.request({ method, url: path, data: body }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'eSignatures.io',
          reason: 'esignatures_api_error',
          operation
        })
    );
    if (isApiErrorRecord(raw) && raw.status === 'error') {
      throw buildApiServiceError(
        { response: { data: raw } },
        {
          providerLabel: 'eSignatures.io',
          reason: 'esignatures_api_error',
          operation: `${method} ${path}`,
          detailKeys: ['message', 'error_message', 'error_code', 'error'],
          nestedKeys: ['data', 'errors']
        }
      );
    }
    let result = schema.safeParse(convertKeys(raw, 'camel'));
    if (!result.success)
      throw createApiServiceError(
        `eSignatures.io returned an unexpected response for ${method} ${path}.`,
        { reason: 'esignatures_invalid_response' }
      );
    return result.data;
  }

  async createContract(params: CreateContractParams) {
    return this.request(
      'POST',
      '/contracts',
      contractResponseSchema,
      convertKeys(
        {
          ...params,
          signers: params.signers.map(mapSigner),
          placeholderFields: mapPlaceholderFields(params.placeholderFields)
        },
        'snake'
      )
    );
  }

  async queryContract(contractId: string) {
    return this.request(
      'GET',
      `/contracts/${encodeURIComponent(contractId)}`,
      contractResponseSchema
    );
  }

  async withdrawContract(contractId: string) {
    return this.request(
      'POST',
      `/contracts/${encodeURIComponent(contractId)}/withdraw`,
      statusResponseSchema
    );
  }

  async sendDraftContract(contractId: string) {
    return this.request(
      'POST',
      `/contracts/${encodeURIComponent(contractId)}/send_draft`,
      statusResponseSchema
    );
  }

  async generatePdfPreview(contractId: string) {
    return this.request(
      'POST',
      `/contracts/${encodeURIComponent(contractId)}/generate_pdf_preview`,
      statusResponseSchema
    );
  }

  async addSigner(contractId: string, signer: Signer) {
    return this.request(
      'POST',
      `/contracts/${encodeURIComponent(contractId)}/signers`,
      statusResponseSchema,
      convertKeys(mapSigner(signer), 'snake')
    );
  }

  async updateSigner(contractId: string, signerId: string, params: UpdateSignerParams) {
    return this.request(
      'POST',
      `/contracts/${encodeURIComponent(contractId)}/signers/${encodeURIComponent(signerId)}`,
      statusResponseSchema,
      convertKeys(mapSigner(params), 'snake')
    );
  }

  async sendContract(contractId: string, signerId: string) {
    return this.request(
      'POST',
      `/contracts/${encodeURIComponent(contractId)}/signers/${encodeURIComponent(signerId)}/send_contract`,
      statusResponseSchema
    );
  }

  async deleteSigner(contractId: string, signerId: string) {
    return this.request(
      'POST',
      `/contracts/${encodeURIComponent(contractId)}/signers/${encodeURIComponent(signerId)}/delete`,
      statusResponseSchema
    );
  }

  async createTemplate(params: CreateTemplateParams) {
    if (params.markdown !== undefined && params.documentElements !== undefined) {
      throw createApiServiceError('Provide markdown or documentElements, rather than both.');
    }
    if (params.markdown === undefined && !params.documentElements?.length) {
      throw createApiServiceError('Provide markdown to define the template content.');
    }
    return this.request(
      'POST',
      '/templates',
      templateCreatedResponseSchema,
      convertKeys(params, 'snake')
    );
  }

  async updateTemplate(templateId: string, params: UpdateTemplateParams) {
    if (!Object.values(params).some(value => value !== undefined)) {
      throw createApiServiceError('Provide a title, labels, or documentElements to update.');
    }
    return this.request(
      'POST',
      `/templates/${encodeURIComponent(templateId)}`,
      statusResponseSchema,
      convertKeys(params, 'snake')
    );
  }

  async copyTemplate(templateId: string, params: CopyTemplateParams) {
    let { placeholderFields, targetApiKey, title } = params;
    // Keep title optional for existing callers, while satisfying the current API.
    title ??= (await this.queryTemplate(templateId)).data.title;
    if (!title) throw createApiServiceError('Provide a title for the copied template.');
    return this.request(
      'POST',
      `/templates/${encodeURIComponent(templateId)}/duplicate`,
      templateCreatedResponseSchema,
      {
        title,
        placeholder_fields: mapPlaceholderFields(placeholderFields),
        target_secret_token: targetApiKey
      }
    );
  }

  async queryTemplate(templateId: string) {
    return this.request(
      'GET',
      `/templates/${encodeURIComponent(templateId)}`,
      templateResponseSchema
    );
  }

  async listTemplates() {
    return this.request('GET', '/templates', templateListResponseSchema);
  }

  async deleteTemplate(templateId: string) {
    return this.request(
      'POST',
      `/templates/${encodeURIComponent(templateId)}/delete`,
      statusResponseSchema
    );
  }

  async addCollaborator(templateId: string, name: string, email?: string) {
    return this.request(
      'POST',
      `/templates/${encodeURIComponent(templateId)}/collaborators`,
      collaboratorsResponseSchema,
      { name, email }
    );
  }

  async listCollaborators(templateId: string) {
    return this.request(
      'GET',
      `/templates/${encodeURIComponent(templateId)}/collaborators`,
      collaboratorsResponseSchema
    );
  }

  async removeCollaborator(templateId: string, collaboratorId: string) {
    return this.request(
      'POST',
      `/templates/${encodeURIComponent(templateId)}/collaborators/${encodeURIComponent(collaboratorId)}/remove`,
      statusResponseSchema
    );
  }

  async getDocumentContent(resource: DocumentResource, resourceId: string) {
    return this.request(
      'GET',
      `/${resource}s/${encodeURIComponent(resourceId)}/content`,
      contentResponseSchema
    );
  }

  async updateDocumentContent(
    resource: DocumentResource,
    resourceId: string,
    edits: ContentEdit[],
    dryRun?: string
  ) {
    return this.request(
      'POST',
      `/${resource}s/${encodeURIComponent(resourceId)}/content`,
      contentUpdateResponseSchema,
      convertKeys({ edits, dryRun }, 'snake')
    );
  }
}
