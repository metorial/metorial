import {
  AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX,
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';

export class Client {
  private http;
  private redactor: AuthConfigSecretRedactor;

  constructor(config: { token: string }) {
    if (!config.token.trim() || /[\r\n]/.test(config.token))
      throw createApiServiceError(
        'Provide the Secret Base64 API key from LeadIQ Settings > API Keys.',
        { reason: 'invalid_credentials' }
      );
    this.redactor = new AuthConfigSecretRedactor({ token: config.token.trim() });
    this.http = createAxios({
      baseURL: 'https://api.leadiq.com',
      timeout: 45000,
      maxRedirects: 0,
      headers: {
        'Content-Type': 'application/json',

        Authorization: `Basic ${config.token.trim()}`
      }
    });
  }

  private async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    try {
      let response = await this.http.post('/graphql', {
        query,
        ...(variables ? { variables } : {})
      });
      if (response.status !== 200 || !isApiErrorRecord(response.data))
        throw createApiServiceError('LeadIQ did not return a completed GraphQL response.', {
          reason: 'invalid_api_response',
          upstreamStatus: response.status
        });
      if (response.data.errors !== undefined && !Array.isArray(response.data.errors))
        throw createApiServiceError('LeadIQ returned an invalid GraphQL error envelope.', {
          reason: 'invalid_api_response'
        });
      if (Array.isArray(response.data.errors) && response.data.errors.length > 0) {
        // Provider messages can echo submitted contact data or credentials; expose only safe status metadata.
        throw createApiServiceError(
          'LeadIQ rejected the GraphQL operation. Check the input, enabled API features and credit balance; submitted values are omitted.',
          { reason: 'graphql_error', upstreamStatus: response.status }
        );
      }
      if (!isApiErrorRecord(response.data.data))
        throw createApiServiceError('LeadIQ returned no GraphQL data.', {
          reason: 'invalid_api_response'
        });
      return normalizeNulls(this.sanitize(response.data.data)) as T;
    } catch (error) {
      const details =
        isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : {};
      const rawStatus = getApiErrorStatus(error) ?? details.upstreamStatus;
      const status =
        typeof rawStatus === 'number' &&
        Number.isInteger(rawStatus) &&
        rawStatus >= 100 &&
        rawStatus <= 599
          ? rawStatus
          : undefined;
      const reason =
        details.reason === 'invalid_api_response' || details.reason === 'graphql_error'
          ? details.reason
          : 'api_request_failed';
      // The shared builder returns existing ServiceErrors unchanged. Rebuild from status only.
      throw buildApiServiceError(status === undefined ? {} : { response: { status } }, {
        providerLabel: 'LeadIQ',
        reason,
        parent: {},
        extractMessage: () =>
          'Check the API key, account permissions, quota and request inputs; transport details are omitted.'
      });
    }
  }

  private sanitize(value: unknown): unknown {
    if (typeof value === 'string')
      return this.redactor
        .redactEmbedded(value)
        .replaceAll(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}token$$`, '[redacted]')
        .replaceAll(`${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}token`, '[redacted]');
    if (Array.isArray(value)) return value.map(item => this.sanitize(item));
    if (isApiErrorRecord(value))
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [this.sanitize(key), this.sanitize(item)])
      );
    return value;
  }

  async searchPeople(input: SearchPeopleInput): Promise<any> {
    let query = `
      query SearchPeople($input: SearchPeopleInput!) {
        searchPeople(input: $input) {
          totalResults
          hasMore
          results {
            id
            name {
              first
              middle
              last
              fullName
            }
            linkedin {
              linkedinId
              linkedinUrl
            }
            personalEmails {
              value
              type
              status
              updatedAt
            }
            personalPhones {
              value
              type
              verificationStatus
              status
              updatedAt
            }
            currentPositions {
              companyId
              title
              dateRange {
                start
                end
              }
              updatedAt
              emails {
                value
                type
                status
                updatedAt
              }
              phones {
                value
                type
                verificationStatus
                status
                updatedAt
              }
              companyInfo {
                id
                name
                domain
                industry
                numberOfEmployees
                locationInfo {
                  formattedAddress
                  city
                  areaLevel1
                  country
                  countryCode2
                  postalCode
                }
              }
            }
            pastPositions {
              companyId
              title
              dateRange {
                start
                end
              }
              updatedAt
              emails {
                value
                type
                status
                updatedAt
              }
              phones {
                value
                type
                verificationStatus
                status
                updatedAt
              }
              companyInfo {
                id
                name
                domain
                industry
              }
            }
          }
        }
      }
    `;

    let result = await this.graphql<Record<string, any>>(query, { input });
    return result.searchPeople;
  }

  async searchCompany(input: SearchCompanyInput): Promise<any> {
    let query = `
      query SearchCompany($input: SearchCompanyInput!) {
        searchCompany(input: $input) {
          totalResults
          hasMore
          results {
            id
            name
            alternativeNames
            domain
            description
            emailDomains
            type
            phones
            address
            locationInfo {
              formattedAddress
              street1
              street2
              city
              areaLevel1
              country
              countryCode2
              countryCode3
              postalCode
            }
            logoUrl
            linkedinId
            linkedinUrl
            numberOfEmployees
            employeeRange
            industry
            specialities
            fundingInfo {
              fundingRounds
              fundingRoundsText: fundingRounds
              fundingTotalUsd
              lastFundingOn
              lastFundingType
              lastFundingUsd
            }
            technologies {
              name
              category
              parentCategory
              categories
            }
            revenueRange {
              start
              end
              description
            }
            sicCode {
              code
              description
            }
            secondarySicCodes {
              code
              description
            }
            naicsCode {
              code
              description
            }
            crunchbaseUrl
            facebookUrl
            twitterUrl
            foundedYear
            companyHierarchy {
              isUltimate
              parent {
                id
                name
              }
              ultimateParent {
                id
                name
              }
            }
            updatedDate
          }
        }
      }
    `;

    let result = await this.graphql<Record<string, any>>(query, { input });
    return result.searchCompany;
  }

  async flatAdvancedSearch(input: FlatSearchInput): Promise<any> {
    let query = `
      query FlatAdvancedSearch($input: FlatSearchInput!) {
        flatAdvancedSearch(input: $input) {
          totalPeople
          after { key value }
          people {
            id
            companyId
            name
            firstName
            middleName
            lastName
            linkedinId
            linkedinUrl
            title
            role
            seniority
            city
            state
            country
            countryCode2
            countryCode3
            updatedAt
            currentPositionStartDate
            picture
            company {
              id
              name
              domain
              industry
              employeeCount
              city
              state
              country
              revenueRange {
                start
                end
                description
              }
              fundingInfo {
                fundingRounds
              fundingRoundsText: fundingRounds
                fundingTotalUsd
                lastFundingOn
                lastFundingType
                lastFundingUsd
              }
              naicsCode {
                code
                description
              }
              sicCode {
                code
                description
              }
            }
          }
        }
      }
    `;

    let result = await this.graphql<Record<string, any>>(query, { input });
    return result.flatAdvancedSearch;
  }

  async groupedAdvancedSearch(input: GroupedSearchInput): Promise<any> {
    let query = `
      query GroupedAdvancedSearch($input: GroupedSearchInput!) {
        groupedAdvancedSearch(input: $input) {
          totalCompanies
          after { key value }
          companies {
            totalContactsInCompany
            company {
              id
              name
              domain
              industry
              employeeCount
              city
              state
              country
              revenueRange {
                start
                end
                description
              }
              fundingInfo {
                fundingRounds
              fundingRoundsText: fundingRounds
                fundingTotalUsd
                lastFundingOn
                lastFundingType
                lastFundingUsd
              }
              naicsCode {
                code
                description
              }
              sicCode {
                code
                description
              }
            }
            people {
              id
              companyId
              name
              firstName
              middleName
              lastName
              linkedinId
              linkedinUrl
              title
              role
              seniority
              city
              state
              country
                          updatedAt
              currentPositionStartDate
              picture
            }
          }
        }
      }
    `;

    let result = await this.graphql<Record<string, any>>(query, { input });
    return result.groupedAdvancedSearch;
  }

  async getAccount(): Promise<any> {
    let query = `query Account { account {
      plans { name product status nextBillingPeriod }
      dataHubPlan { name product status nextBillingPeriod available used visibility { sku dataPoints } costs { sku costs { dataPoint cost costInDecimals } } }
      universalPlan { name product status nextBillingPeriod available used visibility { sku dataPoints } costs { sku costs { dataPoint cost costInDecimals } } }
    } }`;
    let result = await this.graphql<Record<string, any>>(query);
    if (!isApiErrorRecord(result.account) || !Array.isArray(result.account.plans))
      throw createApiServiceError('LeadIQ returned no current account plans.', {
        reason: 'invalid_api_response'
      });
    return result.account;
  }

  async submitPersonFeedback(input: PersonFeedbackInput): Promise<any> {
    let query = `
      mutation SubmitPersonFeedback($input: ApiPersonFeedback!) {
        submitPersonFeedback(input: $input)
      }
    `;

    let result = await this.graphql<Record<string, any>>(query, { input });
    return result.submitPersonFeedback;
  }
  async listCompanyLists(limit?: number, cursor?: string): Promise<any> {
    let result = await this.graphql<Record<string, any>>(
      `query CompanyLists($limit: Int, $cursor: ID) { companyLists(limit: $limit, cursor: $cursor) { items { ${listFields} } nextCursor } }`,
      { limit, cursor }
    );
    return requireObject(result.companyLists, 'company list page');
  }

  async getCompanyList(id: string, limit?: number, cursor?: string): Promise<any> {
    let result = await this.graphql<Record<string, any>>(
      `query CompanyList($id: ID!, $limit: Int, $cursor: ID) { companyList(id: $id) { ${listMetadataFields} companies(limit: $limit, cursor: $cursor) { items { ${entryFields} } nextCursor } } }`,
      { id, limit, cursor }
    );
    return requireObject(result.companyList, 'company list');
  }

  async createCompanyList(input: { name: string; description?: string }): Promise<any> {
    let result = await this.graphql<Record<string, any>>(
      `mutation CreateCompanyList($input: CreateCompanyListInput!) { createCompanyList(input: $input) { ${listFields} } }`,
      { input }
    );
    return requireObject(result.createCompanyList, 'created company list');
  }

  async updateCompanyList(
    id: string,
    input: { name?: string; description?: string }
  ): Promise<any> {
    let result = await this.graphql<Record<string, any>>(
      `mutation UpdateCompanyList($id: ID!, $input: UpdateCompanyListInput!) { updateCompanyList(id: $id, input: $input) { ${listFields} } }`,
      { id, input }
    );
    return requireObject(result.updateCompanyList, 'updated company list');
  }

  async deleteCompanyList(id: string): Promise<any> {
    let result = await this.graphql<Record<string, any>>(
      `mutation DeleteCompanyList($id: ID!) { deleteCompanyList(id: $id) { id name deletedCompanies } }`,
      { id }
    );
    return requireObject(result.deleteCompanyList, 'deleted company list confirmation');
  }

  async addCompaniesToCompanyList(
    listId: string,
    companies: SaveCompanyInput[]
  ): Promise<any> {
    let result = await this.graphql<Record<string, any>>(
      `mutation AddCompaniesToCompanyList($listId: ID!, $companies: [SaveCompanyInput!]!) { addCompaniesToCompanyList(listId: $listId, companies: $companies) { succeeded { ${entryFields} } created updated failed { index reason } } }`,
      { listId, companies }
    );
    return requireObject(result.addCompaniesToCompanyList, 'saved company results');
  }

  async removeCompanyFromCompanyList(listId: string, companyEntryId: string): Promise<any> {
    let result = await this.graphql<Record<string, any>>(
      `mutation RemoveCompanyFromCompanyList($listId: ID!, $companyEntryId: ID!) { removeCompanyFromCompanyList(listId: $listId, companyEntryId: $companyEntryId) { ${entryFields} } }`,
      { listId, companyEntryId }
    );
    return requireObject(result.removeCompanyFromCompanyList, 'removed company entry');
  }
}

export interface SearchPeopleInput {
  id?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  fullName?: string;
  company?: {
    name?: string;
    domain?: string;
    linkedinId?: string;
    country?: string;
    searchInPastCompanies?: boolean;
  };
  linkedinId?: string;
  linkedinUrl?: string;
  email?: string;
  hashedEmail?: string;
  phone?: string;
  workEmailStatusIn?: string[];
  containsWorkContactInfo?: boolean;
  profileFilter?: string[];
  includeInvalid?: boolean;
  qualityFilter?: { phone?: string };
  minConfidence?: number;
  skip?: number;
  limit?: number;
}

export interface SearchCompanyInput {
  id?: string;
  name?: string;
  domain?: string;
  linkedinId?: string;
  linkedinUrl?: string;
  strict?: boolean;
}

export interface LocationFilterInput {
  cities?: string[];
  states?: string[];
  countries?: string[];
  countryCode2s?: string[];
}

export interface CompanySizeFilter {
  min?: number;
  max?: number;
}

export interface RangeFilter {
  min?: number;
  max?: number;
}

export interface DateRangeFilter {
  start?: string;
  end?: string;
}

export interface FundingInfoFilter {
  fundingRoundsMin?: number;
  fundingRoundsMax?: number;
  fundingTotalUsdMin?: number;
  fundingTotalUsdMax?: number;
  lastFundingTypes?: string[];
}

export interface ContactFilter {
  ids?: string[];
  names?: string[];
  titles?: string[];
  linkedinIds?: string[];
  linkedinUrls?: string[];
  seniorities?: string[];
  roles?: string[];
  locations?: { city?: string; areaLevel1?: string; country?: string; postalCode?: string }[];
  containsWorkEmails?: string[];
  updatedAt?: { start?: number; end?: number };
  newHireFrom?: number;
  newPromotionFrom?: number;
}

export interface CompanyFilter {
  ids?: string[];
  names?: string[];
  domains?: string[];
  linkedinIds?: string[];
  industries?: string[];
  sizes?: CompanySizeFilter[];
  locations?: { city?: string; areaLevel1?: string; country?: string; postalCode?: string }[];
  descriptions?: string[];
  technologies?: string[];
  technologyCategories?: string[];
  revenueRanges?: { start?: number; end?: number }[];
  fundingInfoFilters?: {
    totalFundingRange?: { start?: number; end?: number };
    lastFundingRange?: { start?: number; end?: number };
    lastFundingDateRange?: { start?: number; end?: number };
  }[];
  naicsCodeFilters?: { code?: string; description?: string }[];
  sicCodeFilters?: { code?: string; description?: string }[];
}

export interface FlatSearchInput {
  companyFilter?: CompanyFilter;
  companyExcludedFilter?: CompanyFilter;
  contactFilter?: ContactFilter;
  contactExcludedFilter?: ContactFilter;
  skip?: number;
  limit?: number;
  after?: { key: string; value: string }[];
  sortContactsBy?: string[];
}

export interface GroupedSearchInput {
  companyFilter?: CompanyFilter;
  companyExcludedFilter?: CompanyFilter;
  contactFilter?: ContactFilter;
  contactExcludedFilter?: ContactFilter;
  skip?: number;
  limit?: number;
  limitPerCompany?: number;
  sortCompaniesBy?: string[];
  after?: { key: string; value: string }[];
  sortContactsBy?: string[];
}

export interface PersonFeedbackInput {
  personId?: string;
  linkedinUrl?: string;
  linkedinId?: string;
  name?: string;
  companyId?: string;
  companyName?: string;
  companyDomain?: string;
  title?: string;
  value?: string;
  status?: string;
  invalidReason?: string;
  type?: string;
  lastSeen?: string;
}

const entryFields = 'id companyId name domain linkedinUrl notes createdAt updatedAt';
const listMetadataFields = 'id name description createdAt updatedAt';
const listFields = `${listMetadataFields} companies { items { ${entryFields} } nextCursor }`;

// Optional GraphQL fields are nullable; omit unavailable values without inventing empty data.
function normalizeNulls(value: unknown): unknown {
  if (value === null) return undefined;
  if (Array.isArray(value)) return value.map(normalizeNulls);
  if (isApiErrorRecord(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        if (key === 'fundingRounds' && typeof item === 'string')
          return [
            key,
            /^\d+$/.test(item) && Number.isSafeInteger(Number(item)) ? Number(item) : undefined
          ];
        return [key, normalizeNulls(item)];
      })
    );
  return value;
}
function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!isApiErrorRecord(value))
    throw createApiServiceError(`LeadIQ returned no ${label}; completion is unconfirmed.`, {
      reason: 'invalid_api_response'
    });
  return value;
}
export interface SaveCompanyInput {
  companyId?: string;
  name?: string;
  domain?: string;
  linkedinUrl?: string;
  notes?: string;
}
