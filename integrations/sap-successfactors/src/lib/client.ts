import { createAxios } from 'slates';
import type { ODataCollectionResponse, ODataResponse, QueryOptions } from './types';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: {
    token: string;
    apiServerUrl: string;
  }) {
    this.axios = createAxios({
      baseURL: `${config.apiServerUrl}/odata/v2`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  private buildQueryParams(options?: QueryOptions): Record<string, string> {
    let params: Record<string, string> = {
      $format: 'json'
    };

    if (!options) return params;

    if (options.top !== undefined) params.$top = String(options.top);
    if (options.skip !== undefined) params.$skip = String(options.skip);
    if (options.filter) params.$filter = options.filter;
    if (options.select) params.$select = options.select;
    if (options.expand) params.$expand = options.expand;
    if (options.orderBy) params.$orderby = options.orderBy;
    if (options.inlineCount) params.$inlinecount = 'allpages';
    if (options.search) params.$search = options.search;

    return params;
  }

  // Generic OData operations

  async getEntity<T = Record<string, unknown>>(
    entitySet: string,
    key: string,
    options?: QueryOptions
  ): Promise<T> {
    let params = this.buildQueryParams(options);
    let response = await this.axios.get<ODataResponse<T>>(`/${entitySet}('${key}')`, {
      params
    });
    return response.data.d;
  }

  async getEntityByCompoundKey<T = Record<string, unknown>>(
    entitySet: string,
    keys: Record<string, string | number>,
    options?: QueryOptions
  ): Promise<T> {
    let params = this.buildQueryParams(options);
    let keyStr = Object.entries(keys)
      .map(([k, v]) => (typeof v === 'string' ? `${k}='${v}'` : `${k}=${v}`))
      .join(',');
    let response = await this.axios.get<ODataResponse<T>>(`/${entitySet}(${keyStr})`, {
      params
    });
    return response.data.d;
  }

  async queryEntities<T = Record<string, unknown>>(
    entitySet: string,
    options?: QueryOptions
  ): Promise<{ results: T[]; count?: number; nextLink?: string }> {
    let params = this.buildQueryParams(options);
    let response = await this.axios.get<ODataCollectionResponse<T>>(`/${entitySet}`, {
      params
    });
    return {
      results: response.data.d.results,
      count: response.data.d.__count
        ? Number.parseInt(response.data.d.__count, 10)
        : undefined,
      nextLink: response.data.d.__next
    };
  }

  async createEntity<T = Record<string, unknown>>(
    entitySet: string,
    data: Record<string, unknown>
  ): Promise<T> {
    let response = await this.axios.post<ODataResponse<T>>(`/${entitySet}`, data, {
      params: { $format: 'json' }
    });
    return response.data.d;
  }

  async updateEntity(
    entitySet: string,
    key: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.axios.patch(`/${entitySet}('${key}')`, data, {
      params: { $format: 'json' }
    });
  }

  async updateEntityByCompoundKey(
    entitySet: string,
    keys: Record<string, string | number>,
    data: Record<string, unknown>
  ): Promise<void> {
    let keyStr = Object.entries(keys)
      .map(([k, v]) => (typeof v === 'string' ? `${k}='${v}'` : `${k}=${v}`))
      .join(',');
    await this.axios.patch(`/${entitySet}(${keyStr})`, data, {
      params: { $format: 'json' }
    });
  }

  async upsertEntity<T = Record<string, unknown>>(
    entitySet: string,
    data: Record<string, unknown>
  ): Promise<T> {
    let response = await this.axios.put<ODataResponse<T>>(
      `/upsert`,
      {
        __metadata: { uri: entitySet },
        ...data
      },
      {
        params: { $format: 'json' }
      }
    );
    return response.data.d;
  }

  async deleteEntity(entitySet: string, key: string): Promise<void> {
    await this.axios.delete(`/${entitySet}('${key}')`, {
      params: { $format: 'json' }
    });
  }

  async deleteEntityByCompoundKey(
    entitySet: string,
    keys: Record<string, string | number>
  ): Promise<void> {
    let keyStr = Object.entries(keys)
      .map(([k, v]) => (typeof v === 'string' ? `${k}='${v}'` : `${k}=${v}`))
      .join(',');
    await this.axios.delete(`/${entitySet}(${keyStr})`, {
      params: { $format: 'json' }
    });
  }

  // Employee Central

  async getEmployee(userId: string, options?: QueryOptions): Promise<Record<string, unknown>> {
    return this.getEntity('User', userId, options);
  }

  async queryEmployees(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('User', options);
  }

  async getPersonalInfo(
    personIdExternal: string,
    startDate: string,
    options?: QueryOptions
  ): Promise<Record<string, unknown>> {
    return this.getEntityByCompoundKey(
      'PerPersonal',
      {
        personIdExternal,
        startDate
      },
      options
    );
  }

  async queryPersonalInfo(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('PerPersonal', options);
  }

  async getEmploymentInfo(
    userId: string,
    options?: QueryOptions
  ): Promise<Record<string, unknown>> {
    return this.getEntity('EmpEmployment', userId, options);
  }

  async queryEmploymentInfo(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('EmpEmployment', options);
  }

  async getJobInfo(
    userId: string,
    seqNumber: number,
    startDate: string,
    options?: QueryOptions
  ): Promise<Record<string, unknown>> {
    return this.getEntityByCompoundKey(
      'EmpJob',
      {
        userId,
        seqNumber,
        startDate
      },
      options
    );
  }

  async queryJobInfo(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('EmpJob', options);
  }

  async getCompensationInfo(
    userId: string,
    seqNumber: number,
    startDate: string,
    options?: QueryOptions
  ): Promise<Record<string, unknown>> {
    return this.getEntityByCompoundKey(
      'EmpCompensation',
      {
        userId,
        seqNumber,
        startDate
      },
      options
    );
  }

  async queryCompensationInfo(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('EmpCompensation', options);
  }

  // Organizational Management

  async getPosition(
    code: string,
    effectiveStartDate: string,
    options?: QueryOptions
  ): Promise<Record<string, unknown>> {
    return this.getEntityByCompoundKey(
      'Position',
      {
        code,
        effectiveStartDate
      },
      options
    );
  }

  async queryPositions(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('Position', options);
  }

  async getDepartment(
    externalCode: string,
    effectiveStartDate: string,
    options?: QueryOptions
  ): Promise<Record<string, unknown>> {
    return this.getEntityByCompoundKey(
      'FODepartment',
      {
        externalCode,
        startDate: effectiveStartDate
      },
      options
    );
  }

  async queryDepartments(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('FODepartment', options);
  }

  async queryDivisions(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('FODivision', options);
  }

  async queryCostCenters(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('FOCostCenter', options);
  }

  async queryLocations(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('FOLocation', options);
  }

  async queryCompanies(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('FOCompany', options);
  }

  // Recruiting

  async getJobRequisition(
    jobReqId: number,
    options?: QueryOptions
  ): Promise<Record<string, unknown>> {
    return this.getEntityByCompoundKey('JobRequisition', { jobReqId }, options);
  }

  async queryJobRequisitions(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('JobRequisition', options);
  }

  async getJobApplication(
    applicationId: number,
    options?: QueryOptions
  ): Promise<Record<string, unknown>> {
    return this.getEntityByCompoundKey('JobApplication', { applicationId }, options);
  }

  async queryJobApplications(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('JobApplication', options);
  }

  async getCandidate(
    candidateId: number,
    options?: QueryOptions
  ): Promise<Record<string, unknown>> {
    return this.getEntityByCompoundKey('Candidate', { candidateId }, options);
  }

  async queryCandidates(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('Candidate', options);
  }

  // Time & Attendance

  async queryTimeOff(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('EmployeeTime', options);
  }

  async queryTimeAccounts(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('EmployeeTimeAccount', options);
  }

  async createTimeOff(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.createEntity('EmployeeTime', data);
  }

  // Performance & Goals

  async queryGoalPlans(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('GoalPlanTemplate', options);
  }

  async queryGoals(
    planId: number,
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities(`Goal_${planId}`, options);
  }

  async queryPerformanceReviews(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('FormHeader', options);
  }

  async getPerformanceReview(
    formDataId: number,
    options?: QueryOptions
  ): Promise<Record<string, unknown>> {
    return this.getEntityByCompoundKey('FormHeader', { formDataId }, options);
  }

  // Succession & Development

  async querySuccessionNominees(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('SuccessionNominee', options);
  }

  async queryTalentPools(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('TalentPool', options);
  }

  // Learning

  async queryLearningHistories(
    options?: QueryOptions
  ): Promise<{ results: Record<string, unknown>[]; count?: number }> {
    return this.queryEntities('LearningHistoryV1', options);
  }

  // Metadata

  async getEntityMetadata(entitySet: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/${entitySet}/$metadata`, {
      headers: { Accept: 'application/xml' }
    });
    return { metadata: response.data };
  }
}
