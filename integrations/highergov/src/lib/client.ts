import { createAxios } from 'slates';

let BASE_URL = 'https://www.highergov.com';

export interface PaginatedResponse<T> {
  results: T[];
  meta: {
    pagination: {
      page: number;
      pages: number;
      count: number;
    };
  };
  links: {
    first: string | null;
    last: string | null;
    next: string | null;
    prev: string | null;
  };
}

export class Client {
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL
    });
  }

  private buildParams(params: Record<string, unknown>): Record<string, string> {
    let result: Record<string, string> = { api_key: this.token };
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        result[key] = String(value);
      }
    }
    return result;
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
    return response.data;
  }

  async getGrants(
    params: {
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
    return response.data;
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
    return response.data;
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
    return response.data;
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
    return response.data;
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
    return response.data;
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
    return response.data;
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
    return response.data;
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
    return response.data;
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
    return response.data;
  }

  async getDocuments(params: {
    relatedKey: string;
    ordering?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/api-external/document/', {
      params: this.buildParams({
        related_key: params.relatedKey,
        ordering: params.ordering,
        page_number: params.pageNumber,
        page_size: params.pageSize
      })
    });
    return response.data;
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
    return response.data;
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
    return response.data;
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
    return response.data;
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
    return response.data;
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
    return response.data;
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
    return response.data;
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
    return response.data;
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
