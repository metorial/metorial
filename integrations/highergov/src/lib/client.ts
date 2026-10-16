import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import { z } from 'zod';
import { getDocumentRelatedKey } from './documents';

let BASE_URL = 'https://www.highergov.com';

let pageSchema = z.object({
  results: z.array(z.record(z.string(), z.unknown())),
  meta: z.object({
    pagination: z.object({
      page: z.number(),
      pages: z.number(),
      count: z.number()
    })
  })
});

export interface PaginatedResponse<T> {
  results: T[];
  meta: {
    pagination: {
      page: number;
      pages: number;
      count: number;
    };
  };
  links?: {
    first: string | null;
    last: string | null;
    next: string | null;
    prev: string | null;
  };
}

export class Client {
  private axios;

  constructor(private token: string) {
    if (!token.trim()) {
      throw createApiServiceError(
        'A HigherGov API key is required. Reconnect with a valid key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 30_000,
      contentType: false,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'HigherGov',
          reason: 'highergov_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
        })
    });
  }

  private buildParams(params: Record<string, unknown>): Record<string, string> {
    let result: Record<string, string> = { api_key: this.token };
    for (let [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (typeof value === 'string' && !value.trim()) {
        throw createApiServiceError(`${key} must not be blank when provided.`);
      }
      if (typeof value === 'number' && !Number.isSafeInteger(value)) {
        throw createApiServiceError(`${key} must be a whole number.`);
      }
      if (key === 'page_number' && Number(value) < 1) {
        throw createApiServiceError('pageNumber must be at least 1.');
      }
      if (key === 'page_size' && (Number(value) < 1 || Number(value) > 100)) {
        throw createApiServiceError('pageSize must be between 1 and 100.');
      }
      if (key.endsWith('_date') && typeof value === 'string') {
        let parsed = new Date(`${value}T00:00:00Z`);
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          Number.isNaN(parsed.getTime()) ||
          parsed.toISOString().slice(0, 10) !== value
        ) {
          throw createApiServiceError(`${key} must be a valid date in YYYY-MM-DD format.`);
        }
      }
      result[key] = String(value);
    }
    return result;
  }

  private validatePage(data: unknown): PaginatedResponse<Record<string, unknown>> {
    if (!pageSchema.safeParse(data).success) {
      throw createApiServiceError(
        'HigherGov returned an invalid paginated response. Try the request again.'
      );
    }
    return data as PaginatedResponse<Record<string, unknown>>;
  }

  async getContracts(
    params: {
      awardId?: string;
      awardeeKey?: number;
      awardeeKeyParent?: number;
      awardeeUei?: string;
      awardeeUeiParent?: string;
      awardingAgencyKey?: number;
      fundingAgencyKey?: number;
      lastModifiedDate?: string;
      capturedDate?: string;
      naicsCode?: string;
      pscCode?: string;
      searchId?: string;
      parentAwardId?: string;
      vehicleKey?: number;
      ordering?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/contract/', {
      params: this.buildParams({
        award_id: params.awardId,
        awardee_key: params.awardeeKey,
        awardee_key_parent: params.awardeeKeyParent,
        awardee_uei: params.awardeeUei,
        awardee_uei_parent: params.awardeeUeiParent,
        awarding_agency_key: params.awardingAgencyKey,
        funding_agency_key: params.fundingAgencyKey,
        last_modified_date: params.lastModifiedDate,
        captured_date: params.capturedDate,
        naics_code: params.naicsCode,
        psc_code: params.pscCode,
        search_id: params.searchId,
        parent_award_id: params.parentAwardId,
        vehicle_key: params.vehicleKey,
        ordering: params.ordering,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getGrants(
    params: {
      awardId?: string;
      awardeeKey?: number;
      awardeeKeyParent?: number;
      awardeeUei?: string;
      awardeeUeiParent?: string;
      awardingAgencyKey?: number;
      fundingAgencyKey?: number;
      lastModifiedDate?: string;
      cfdaProgramNumber?: string;
      searchId?: string;
      ordering?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/grant/', {
      params: this.buildParams({
        award_id: params.awardId,
        awardee_key: params.awardeeKey,
        awardee_key_parent: params.awardeeKeyParent,
        awardee_uei: params.awardeeUei,
        awardee_uei_parent: params.awardeeUeiParent,
        awarding_agency_key: params.awardingAgencyKey,
        funding_agency_key: params.fundingAgencyKey,
        last_modified_date: params.lastModifiedDate,
        cfda_program_number: params.cfdaProgramNumber,
        search_id: params.searchId,
        ordering: params.ordering,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getIdvAwards(
    params: {
      awardId?: string;
      awardeeKey?: number;
      awardeeKeyParent?: number;
      awardeeUei?: string;
      awardeeUeiParent?: string;
      awardingAgencyKey?: number;
      fundingAgencyKey?: number;
      lastModifiedDate?: string;
      naicsCode?: string;
      pscCode?: string;
      parentAwardId?: string;
      vehicleKey?: number;
      ordering?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/idv/', {
      params: this.buildParams({
        award_id: params.awardId,
        awardee_key: params.awardeeKey,
        awardee_key_parent: params.awardeeKeyParent,
        awardee_uei: params.awardeeUei,
        awardee_uei_parent: params.awardeeUeiParent,
        awarding_agency_key: params.awardingAgencyKey,
        funding_agency_key: params.fundingAgencyKey,
        last_modified_date: params.lastModifiedDate,
        naics_code: params.naicsCode,
        psc_code: params.pscCode,
        parent_award_id: params.parentAwardId,
        vehicle_key: params.vehicleKey,
        ordering: params.ordering,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getSubcontracts(
    params: {
      awardeeKey?: number;
      awardeeKeyParent?: number;
      awardeeUei?: string;
      awardeeUeiParent?: string;
      awardingAgencyKey?: number;
      fundingAgencyKey?: number;
      lastModifiedDate?: string;
      ordering?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/subcontract/', {
      params: this.buildParams({
        awardee_key: params.awardeeKey,
        awardee_key_parent: params.awardeeKeyParent,
        awardee_uei: params.awardeeUei,
        awardee_uei_parent: params.awardeeUeiParent,
        awarding_agency_key: params.awardingAgencyKey,
        funding_agency_key: params.fundingAgencyKey,
        last_modified_date: params.lastModifiedDate,
        ordering: params.ordering,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getSubgrants(
    params: {
      awardeeKey?: number;
      awardeeKeyParent?: number;
      awardeeUei?: string;
      awardeeUeiParent?: string;
      awardingAgencyKey?: number;
      fundingAgencyKey?: number;
      lastModifiedDate?: string;
      ordering?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/subgrant/', {
      params: this.buildParams({
        awardee_key: params.awardeeKey,
        awardee_key_parent: params.awardeeKeyParent,
        awardee_uei: params.awardeeUei,
        awardee_uei_parent: params.awardeeUeiParent,
        awarding_agency_key: params.awardingAgencyKey,
        funding_agency_key: params.fundingAgencyKey,
        last_modified_date: params.lastModifiedDate,
        ordering: params.ordering,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getOpportunities(
    params: {
      oppKey?: string;
      versionKey?: string;
      sourceId?: string;
      sourceType?: string;
      agencyKey?: number;
      capturedDate?: string;
      postedDate?: string;
      searchId?: string;
      ordering?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/opportunity/', {
      params: this.buildParams({
        opp_key: params.oppKey,
        version_key: params.versionKey,
        source_id: params.sourceId,
        source_type: params.sourceType,
        agency_key: params.agencyKey,
        captured_date: params.capturedDate,
        posted_date: params.postedDate,
        search_id: params.searchId,
        ordering: params.ordering,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getAwardees(
    params: {
      awardeeKeyParent?: number;
      cageCode?: string;
      uei?: string;
      primaryNaics?: string;
      registrationLastUpdateDate?: string;
      ordering?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/awardee/', {
      params: this.buildParams({
        awardee_key_parent: params.awardeeKeyParent,
        cage_code: params.cageCode,
        uei: params.uei,
        primary_naics: params.primaryNaics,
        registration_last_update_date: params.registrationLastUpdateDate,
        ordering: params.ordering,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getAwardeeMentorProtege(
    params: {
      awardeeKeyMentor?: number;
      awardeeKeyMentorParent?: number;
      awardeeKeyProtege?: number;
      awardeeKeyProtegeParent?: number;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/awardee-mp/', {
      params: this.buildParams({
        awardee_key_mentor: params.awardeeKeyMentor,
        awardee_key_mentor_parent: params.awardeeKeyMentorParent,
        awardee_key_protege: params.awardeeKeyProtege,
        awardee_key_protege_parent: params.awardeeKeyProtegeParent,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getAwardeePartnerships(
    params: {
      awardeeKeyPrime?: number;
      awardeeKeyPrimeParent?: number;
      awardeeKeySub?: number;
      awardeeKeySubParent?: number;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/awardee-partnership/', {
      params: this.buildParams({
        awardee_key_prime: params.awardeeKeyPrime,
        awardee_key_prime_parent: params.awardeeKeyPrimeParent,
        awardee_key_sub: params.awardeeKeySub,
        awardee_key_sub_parent: params.awardeeKeySubParent,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getPeople(
    params: {
      contactEmail?: string;
      ordering?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/people/', {
      params: this.buildParams({
        contact_email: params.contactEmail,
        ordering: params.ordering,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getDocuments(params: {
    relatedKey: string;
    ordering?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/document/', {
      params: this.buildParams({
        related_key: getDocumentRelatedKey(params.relatedKey),
        ordering: params.ordering,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getAgencies(
    params: { agencyKey?: number; pageNumber?: number; pageSize?: number } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/agency/', {
      params: this.buildParams({
        agency_key: params.agencyKey,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getVehicles(
    params: {
      vehicleKey?: number;
      ordering?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/vehicle/', {
      params: this.buildParams({
        vehicle_key: params.vehicleKey,
        ordering: params.ordering,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getNaicsCodes(
    params: {
      naicsCode?: string;
      ordering?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/naics/', {
      params: this.buildParams({
        naics_code: params.naicsCode,
        ordering: params.ordering,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getPscCodes(
    params: { pscCode?: string; pageNumber?: number; pageSize?: number } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/psc/', {
      params: this.buildParams({
        psc_code: params.pscCode,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getGrantPrograms(
    params: {
      agencyKey?: number;
      cfdaProgramNumber?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/grant-program/', {
      params: this.buildParams({
        agency_key: params.agencyKey,
        cfda_program_number: params.cfdaProgramNumber,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getNsnData(
    params: {
      cageCode?: string;
      nsn?: string;
      partNumber?: string;
      ordering?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/nsn/', {
      params: this.buildParams({
        cage_code: params.cageCode,
        nsn: params.nsn,
        part_number: params.partNumber,
        ordering: params.ordering,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getSlContracts(
    params: {
      capturedDate?: string;
      startDate?: string;
      endDate?: string;
      searchId?: string;
      ordering?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/sl-contract/', {
      params: this.buildParams({
        captured_date: params.capturedDate,
        start_date: params.startDate,
        end_date: params.endDate,
        search_id: params.searchId,
        ordering: params.ordering,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  async getPursuits(
    params: {
      referenceId?: number;
      uniqueKey?: string;
      searchId?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/pursuit/', {
      params: this.buildParams({
        reference_id: params.referenceId,
        unique_key: params.uniqueKey,
        search_id: params.searchId,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return this.validatePage(response.data);
  }

  // Zapier integration endpoints (use X-API-KEY header)
  async zapierAuth(): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      '/zapier/auth/',
      {},
      {
        headers: {
          'X-API-KEY': this.token,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );
    return response.data;
  }

  async zapierSubscribe(webhookUrl: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      '/zapier/pipeline/subscribe/',
      { target_url: webhookUrl },
      {
        headers: {
          'X-API-KEY': this.token,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );
    return response.data;
  }

  async zapierUnsubscribe(webhookUrl: string): Promise<void> {
    await this.axios.post(
      '/zapier/pipeline/unsubscribe/',
      { target_url: webhookUrl },
      {
        headers: {
          'X-API-KEY': this.token,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );
  }

  async zapierPerform(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/zapier/perform/', {
      headers: {
        'X-API-KEY': this.token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
    return response.data;
  }
}
