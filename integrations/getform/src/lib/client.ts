import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';

export interface ClientConfig {
  token: string;
  apiVersion: 'v1' | 'v2';
}

export interface SubmissionBlock {
  type: string;
  name?: string;
  value?: string | number | boolean;
  values?: string[];
  properties?: Record<string, string>;
}

export interface SubmitFormParams {
  formId: string;
  blocks: SubmissionBlock[];
}

export interface SubmitFormResponse {
  success: boolean;
  redirectUrl?: string;
  submission: {
    hashId: string;
    date: string;
    blocks: Record<string, unknown>;
    submissionInfo?: {
      ip?: string;
      userAgent?: string;
      referer?: string;
      location?: Record<string, unknown>;
    };
  };
}

let submitResponseSchema = z.object({
  success: z.literal(true),
  redirectUrl: z.string().nullish(),
  submission: z.object({
    hashId: z.string().min(1),
    date: z.string().min(1),
    blocks: z.record(z.string(), z.unknown()),
    submissionInfo: z
      .object({
        ip: z.string().optional(),
        userAgent: z.string().optional(),
        referer: z.string().optional(),
        location: z.record(z.string(), z.unknown()).optional()
      })
      .passthrough()
      .optional()
  })
});

let submissionsResponseSchema = z.object({
  data: z.object({
    id: z.union([z.string(), z.number()]).optional(),
    submissions: z.array(
      z.object({
        id: z.union([z.string().min(1), z.number()]),
        submissionDate: z.string().min(1).optional(),
        submission_date: z.string().min(1).optional(),
        status: z.union([z.boolean(), z.string()]),
        submissionStatus: z.string().optional(),
        submission_status: z.string().optional(),
        blocks: z.record(z.string(), z.unknown()),
        files: z
          .array(
            z.object({
              name: z.string(),
              url: z.string()
            })
          )
          .nullish()
      })
    ),
    pagination: z.object({
      count: z.number(),
      currentPage: z.number().optional(),
      current_page: z.number().optional(),
      total: z.number(),
      firstPage: z.number().optional(),
      first_page: z.number().optional(),
      lastPage: z.number().optional(),
      last_page: z.number().optional(),
      size: z.number()
    })
  })
});

export interface GetSubmissionsParams {
  formId: string;
  page?: number;
  size?: number;
  query?: string;
  files?: boolean;
  timezone?: string;
}

export interface Submission {
  id: string;
  submissionId?: number;
  submissionDate: string;
  status: string;
  active?: boolean;
  submissionStatus: string;
  blocks: Record<string, unknown>;
  files?: { name: string; url: string }[];
}

export interface PaginationInfo {
  count: number;
  currentPage: number;
  total: number;
  firstPage: number;
  lastPage: number;
  size: number;
}

export interface GetSubmissionsResponse {
  formId: string;
  submissions: Submission[];
  pagination: PaginationInfo;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private submitAxios: ReturnType<typeof createAuthenticatedAxios>;
  private token: string;
  private apiVersion: 'v1' | 'v2';

  constructor(config: ClientConfig) {
    this.token = config.token.trim();
    this.apiVersion = config.apiVersion;
    if (!this.token) {
      throw createApiServiceError(
        'A Forminit API key or legacy Getform token is required. Reconnect your account.'
      );
    }

    let authHeader =
      this.apiVersion === 'v2' ? { name: 'X-API-Key', value: this.token } : undefined;
    let errorAdapter = (error: unknown) =>
      buildApiServiceError(error, {
        providerLabel: 'Getform/Forminit',
        reason: 'getform_api_error'
      });
    this.axios = createAuthenticatedAxios({
      baseURL:
        this.apiVersion === 'v2' ? 'https://api.forminit.com/v1' : 'https://api.getform.io/v1',
      authHeader,
      headers: { Accept: 'application/json' },
      timeout: 30000,
      errorAdapter
    });
    this.submitAxios = createAuthenticatedAxios({
      baseURL: 'https://forminit.com',
      authHeader,
      headers: { Accept: 'application/json' },
      timeout: 30000,
      errorAdapter
    });
  }

  private formPath(formId: string) {
    if (!formId.trim()) {
      throw createApiServiceError('Provide a non-empty form endpoint ID.');
    }
    return encodeURIComponent(formId.trim());
  }

  private checkSuccess(data: unknown) {
    if (isApiErrorRecord(data) && data.success === false) {
      throw createApiServiceError(
        `Getform/Forminit rejected the request: ${extractApiErrorMessage({ response: { data } })}`,
        {
          reason: 'getform_api_error',
          upstreamCode: typeof data.error === 'string' ? data.error : undefined,
          upstreamStatus: typeof data.code === 'number' ? data.code : undefined
        }
      );
    }
  }

  async submitForm(params: SubmitFormParams): Promise<SubmitFormResponse> {
    let objectTypes = new Set<string>();
    let names = new Set<string>();
    let typeCounts = new Map<string, number>();
    let fieldCount = 0;
    let hasValue = false;
    let blocks = params.blocks.map(block => {
      if (block.type === 'sender' || block.type === 'tracking') {
        if (objectTypes.has(block.type)) {
          throw createApiServiceError(
            `Only one ${block.type} block is allowed per submission.`
          );
        }
        objectTypes.add(block.type);
        if (!block.properties || block.value !== undefined || block.values !== undefined) {
          throw createApiServiceError(
            `${block.type} blocks require properties and cannot use value or values.`
          );
        }
        hasValue ||= Object.values(block.properties).some(value => value.trim().length > 0);
        return { type: block.type, properties: block.properties };
      }
      fieldCount++;
      let count = (typeCounts.get(block.type) ?? 0) + 1;
      typeCounts.set(block.type, count);
      if (fieldCount > 100 || count > 50) {
        throw createApiServiceError(
          'A submission supports at most 100 field blocks and 50 blocks of the same type.'
        );
      }
      if (!block.name || /\s/.test(block.name) || names.has(block.name)) {
        throw createApiServiceError(
          'Each field block needs a unique, non-empty name without spaces.'
        );
      }
      names.add(block.name);
      if (block.properties !== undefined) {
        throw createApiServiceError('Only sender and tracking blocks can use properties.');
      }
      if (block.values !== undefined) {
        if (!['select', 'checkbox'].includes(block.type) || block.value !== undefined) {
          throw createApiServiceError(
            'Use values only for select or checkbox blocks, and omit value.'
          );
        }
      } else if (block.value === undefined) {
        throw createApiServiceError(`Provide a value for the ${block.name} field block.`);
      }
      let value = block.values ?? block.value;
      hasValue ||= Array.isArray(value)
        ? value.some(item => item.trim().length > 0)
        : typeof value !== 'string' || value.trim().length > 0;
      return { type: block.type, name: block.name, value };
    });
    if (!hasValue) {
      throw createApiServiceError('At least one block must contain a value.');
    }

    let response = await this.submitAxios.post(`/f/${this.formPath(params.formId)}`, {
      blocks
    });
    this.checkSuccess(response.data);
    let result = submitResponseSchema.safeParse(response.data);
    if (!result.success) {
      throw createApiServiceError(
        'Getform/Forminit returned an unexpected submission response.',
        {
          reason: 'getform_invalid_response'
        }
      );
    }
    return {
      ...result.data,
      redirectUrl: result.data.redirectUrl ?? undefined
    };
  }

  async getSubmissions(params: GetSubmissionsParams): Promise<GetSubmissionsResponse> {
    let response = await this.axios.get(`/forms/${this.formPath(params.formId)}`, {
      params: pickDefined({
        token: this.apiVersion === 'v1' ? this.token : undefined,
        page: params.page,
        size: params.size,
        query: params.query,
        files: params.files,
        timezone: params.timezone
      })
    });
    this.checkSuccess(response.data);
    let result = submissionsResponseSchema.safeParse(response.data);
    if (!result.success) {
      throw createApiServiceError(
        'Getform/Forminit returned an unexpected submissions response.',
        {
          reason: 'getform_invalid_response'
        }
      );
    }
    let data = result.data.data;
    let submissions = data.submissions.map(submission => {
      let submissionDate = submission.submissionDate ?? submission.submission_date;
      let submissionStatus = submission.submissionStatus ?? submission.submission_status;
      if (submissionDate === undefined || submissionStatus === undefined) {
        throw createApiServiceError(
          'Getform/Forminit omitted a submission date or workflow status.',
          {
            reason: 'getform_invalid_response'
          }
        );
      }
      return {
        id: String(submission.id),
        submissionId: typeof submission.id === 'number' ? submission.id : undefined,
        submissionDate,
        status:
          typeof submission.status === 'boolean'
            ? submission.status
              ? 'active'
              : 'inactive'
            : submission.status,
        active: typeof submission.status === 'boolean' ? submission.status : undefined,
        submissionStatus,
        blocks: submission.blocks,
        files: submission.files ?? undefined
      };
    });
    let pagination = data.pagination;
    let currentPage = pagination.currentPage ?? pagination.current_page;
    let firstPage = pagination.firstPage ?? pagination.first_page;
    let lastPage = pagination.lastPage ?? pagination.last_page;
    if (currentPage === undefined || firstPage === undefined || lastPage === undefined) {
      throw createApiServiceError('Getform/Forminit omitted pagination metadata.', {
        reason: 'getform_invalid_response'
      });
    }
    return {
      formId: data.id !== undefined ? String(data.id) : params.formId,
      submissions,
      pagination: {
        count: pagination.count,
        currentPage,
        total: pagination.total,
        firstPage,
        lastPage,
        size: pagination.size
      }
    };
  }
}
