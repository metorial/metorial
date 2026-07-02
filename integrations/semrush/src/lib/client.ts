import { createAxios } from 'slates';
import { parseCsvResponse } from './csv-parser';

export interface SemrushClientConfig {
  token: string;
  authType: 'api_key' | 'oauth';
  database?: string;
}

export class SemrushAnalyticsClient {
  private axios: ReturnType<typeof createAxios>;
  private token: string;
  private database: string;

  constructor(config: SemrushClientConfig) {
    this.token = config.token;
    this.database = config.database || 'us';
    this.axios = createAxios({
      baseURL: 'https://api.semrush.com'
    });
  }

  private buildParams(
    params: Record<string, string | number | undefined>
  ): Record<string, string | number> {
    let result: Record<string, string | number> = {
      key: this.token
    };
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        result[key] = value;
      }
    }
    return result;
  }

  async getDomainRanks(domain: string, database?: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/', {
      params: this.buildParams({
        type: 'domain_ranks',
        domain,
        database: database || this.database,
        export_columns: 'Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac,Sh,Sv'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getDomainOrganic(params: {
    domain: string;
    database?: string;
    displayLimit?: number;
    displayOffset?: number;
    displaySort?: string;
    displayFilter?: string;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/', {
      params: this.buildParams({
        type: 'domain_organic',
        domain: params.domain,
        database: params.database || this.database,
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        display_sort: params.displaySort,
        display_filter: params.displayFilter,
        export_columns: 'Ph,Po,Pp,Pd,Nq,Cp,Ur,Tr,Tc,Co,Nr,Td'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getDomainAdwords(params: {
    domain: string;
    database?: string;
    displayLimit?: number;
    displayOffset?: number;
    displaySort?: string;
    displayFilter?: string;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/', {
      params: this.buildParams({
        type: 'domain_adwords',
        domain: params.domain,
        database: params.database || this.database,
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        display_sort: params.displaySort,
        display_filter: params.displayFilter,
        export_columns: 'Ph,Po,Nq,Cp,Ur,Tr,Tc,Co,Nr,Td,Tt,Ds,Vu'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getDomainOrganicOrganic(params: {
    domains: string[];
    database?: string;
    displayLimit?: number;
    displayOffset?: number;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/', {
      params: this.buildParams({
        type: 'domain_domains',
        domains: params.domains.join('|'),
        database: params.database || this.database,
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        export_columns: 'Ph,P0,P1,P2,P3,P4,Nr,Nq,Cp,Co'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getDomainOverview(params: {
    domain: string;
    database?: string;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/', {
      params: this.buildParams({
        type: 'domain_rank',
        domain: params.domain,
        database: params.database || this.database,
        export_columns: 'Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac,Sh,Sv'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getDomainOverviewHistory(params: {
    domain: string;
    database?: string;
    displayLimit?: number;
    displayOffset?: number;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/', {
      params: this.buildParams({
        type: 'domain_rank_history',
        domain: params.domain,
        database: params.database || this.database,
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        export_columns: 'Dt,Rk,Or,Ot,Oc,Ad,At,Ac'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getOrganicCompetitors(params: {
    domain: string;
    database?: string;
    displayLimit?: number;
    displayOffset?: number;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/', {
      params: this.buildParams({
        type: 'domain_organic_organic',
        domain: params.domain,
        database: params.database || this.database,
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        export_columns: 'Dn,Cr,Np,Or,Ot,Oc,Ad'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getAdwordsCompetitors(params: {
    domain: string;
    database?: string;
    displayLimit?: number;
    displayOffset?: number;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/', {
      params: this.buildParams({
        type: 'domain_adwords_adwords',
        domain: params.domain,
        database: params.database || this.database,
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        export_columns: 'Dn,Cr,Np,Ad,At,Ac,Or'
      })
    });
    return parseCsvResponse(response.data);
  }

  // Keyword Research

  async getKeywordOverview(params: {
    phrase: string;
    database?: string;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/', {
      params: this.buildParams({
        type: 'phrase_all',
        phrase: params.phrase,
        database: params.database || this.database,
        export_columns: 'Ph,Nq,Cp,Co,Nr,Td,In,Kd'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getKeywordOverviewBatch(params: {
    phrases: string[];
    database?: string;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.post('/', null, {
      params: this.buildParams({
        type: 'phrase_all',
        phrase: params.phrases.join(';'),
        database: params.database || this.database,
        export_columns: 'Ph,Nq,Cp,Co,Nr,Td,In,Kd'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getKeywordOrganicResults(params: {
    phrase: string;
    database?: string;
    displayLimit?: number;
    displayOffset?: number;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/', {
      params: this.buildParams({
        type: 'phrase_organic',
        phrase: params.phrase,
        database: params.database || this.database,
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        export_columns: 'Dn,Ur,Fk,Fp'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getRelatedKeywords(params: {
    phrase: string;
    database?: string;
    displayLimit?: number;
    displayOffset?: number;
    displaySort?: string;
    displayFilter?: string;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/', {
      params: this.buildParams({
        type: 'phrase_related',
        phrase: params.phrase,
        database: params.database || this.database,
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        display_sort: params.displaySort,
        display_filter: params.displayFilter,
        export_columns: 'Ph,Nq,Cp,Co,Nr,Td,Rr,Kd'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getBroadMatchKeywords(params: {
    phrase: string;
    database?: string;
    displayLimit?: number;
    displayOffset?: number;
    displaySort?: string;
    displayFilter?: string;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/', {
      params: this.buildParams({
        type: 'phrase_fullsearch',
        phrase: params.phrase,
        database: params.database || this.database,
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        display_sort: params.displaySort,
        display_filter: params.displayFilter,
        export_columns: 'Ph,Nq,Cp,Co,Nr,Td,Rr,Kd'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getPhraseQuestions(params: {
    phrase: string;
    database?: string;
    displayLimit?: number;
    displayOffset?: number;
    displaySort?: string;
    displayFilter?: string;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/', {
      params: this.buildParams({
        type: 'phrase_questions',
        phrase: params.phrase,
        database: params.database || this.database,
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        display_sort: params.displaySort,
        display_filter: params.displayFilter,
        export_columns: 'Ph,Nq,Cp,Co,Nr,Td,Kd'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getKeywordDifficulty(params: {
    phrase: string;
    database?: string;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/', {
      params: this.buildParams({
        type: 'phrase_kdi',
        phrase: params.phrase,
        database: params.database || this.database,
        export_columns: 'Ph,Kd'
      })
    });
    return parseCsvResponse(response.data);
  }

  // Backlinks

  async getBacklinksOverview(params: {
    target: string;
    targetType?: string;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/analytics/v1/', {
      params: this.buildParams({
        type: 'backlinks_overview',
        target: params.target,
        target_type: params.targetType || 'root_domain',
        export_columns:
          'ascore,total,domains_num,urls_num,ips_num,ipclassc_num,follows_num,nofollows_num,sponsored_num,ugc_num,texts_num,images_num,forms_num,frames_num'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getBacklinks(params: {
    target: string;
    targetType?: string;
    displayLimit?: number;
    displayOffset?: number;
    displaySort?: string;
    displayFilter?: string;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/analytics/v1/', {
      params: this.buildParams({
        type: 'backlinks',
        target: params.target,
        target_type: params.targetType || 'root_domain',
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        display_sort: params.displaySort,
        display_filter: params.displayFilter,
        export_columns:
          'page_score,response_code,source_url,source_title,target_url,anchor,external_num,internal_num,redirect_url,source_size,last_seen,first_seen,nofollow,form,frame,image,sitewide,newlink,lostlink'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getReferringDomains(params: {
    target: string;
    targetType?: string;
    displayLimit?: number;
    displayOffset?: number;
    displaySort?: string;
    displayFilter?: string;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/analytics/v1/', {
      params: this.buildParams({
        type: 'backlinks_refdomains',
        target: params.target,
        target_type: params.targetType || 'root_domain',
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        display_sort: params.displaySort,
        display_filter: params.displayFilter,
        export_columns: 'domain_ascore,domain,backlinks_num,ip,country,first_seen,last_seen'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getBacklinksAnchors(params: {
    target: string;
    targetType?: string;
    displayLimit?: number;
    displayOffset?: number;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/analytics/v1/', {
      params: this.buildParams({
        type: 'backlinks_anchors',
        target: params.target,
        target_type: params.targetType || 'root_domain',
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        export_columns: 'anchor,domains_num,backlinks_num,first_seen,last_seen'
      })
    });
    return parseCsvResponse(response.data);
  }

  async getBacklinksCompetitors(params: {
    target: string;
    targetType?: string;
    displayLimit?: number;
    displayOffset?: number;
  }): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/analytics/v1/', {
      params: this.buildParams({
        type: 'backlinks_competitors',
        target: params.target,
        target_type: params.targetType || 'root_domain',
        display_limit: params.displayLimit,
        display_offset: params.displayOffset,
        export_columns: 'ascore,domain,common_refdomains,domains_num,backlinks_num'
      })
    });
    return parseCsvResponse(response.data);
  }
}
