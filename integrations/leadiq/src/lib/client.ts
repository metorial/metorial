import { createAxios } from 'slates';

export class Client {
  private http;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.leadiq.com',
      headers: {
        'Content-Type': 'application/json',

        Authorization: `Basic ${Buffer.from(`${config.token}:`).toString('base64')}`
      }
    });
  }

  private async graphql<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    let body: Record<string, any> = { query };
    if (variables) {
      body.variables = variables;
    }

    let response = await this.http.post('/graphql', body);
    let data = response.data;

    if (data.errors && data.errors.length > 0) {
      let errorMessages = data.errors.map((e: any) => e.message).join('; ');
      throw new Error(`LeadIQ API error: ${errorMessages}`);
    }

    return data.data;
  }

  async searchPeople(input: SearchPeopleInput): Promise<any> {
    let query = `
      query SearchPeople($input: SearchPeopleInput!) {
        searchPeople(input: $input) {
          totalResults
          hasMore
          results {
            _id
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

    let result = await this.graphql(query, { input });
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

    let result = await this.graphql(query, { input });
    return result.searchCompany;
  }

  async flatAdvancedSearch(input: FlatSearchInput): Promise<any> {
    let query = `
      query FlatAdvancedSearch($input: FlatSearchInput!) {
        flatAdvancedSearch(input: $input) {
          totalPeople
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
            workEmails
            verifiedWorkEmails
            verifiedLikelyWorkEmails
            workPhones
            personalEmails
            personalPhones
            updatedAt
            currentPositionStartDate
            picture
            company {
              id
              name
              domain
              industry
              employeeCount
              employeeRange
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

    let result = await this.graphql(query, { input });
    return result.flatAdvancedSearch;
  }

  async groupedAdvancedSearch(input: GroupedSearchInput): Promise<any> {
    let query = `
      query GroupedAdvancedSearch($input: GroupedSearchInput!) {
        groupedAdvancedSearch(input: $input) {
          totalCompanies
          companies {
            totalContactsInCompany
            company {
              id
              name
              domain
              industry
              employeeCount
              employeeRange
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
              workEmails
              verifiedWorkEmails
              verifiedLikelyWorkEmails
              workPhones
              personalEmails
              personalPhones
              updatedAt
              currentPositionStartDate
              picture
            }
          }
        }
      }
    `;

    let result = await this.graphql(query, { input });
    return result.groupedAdvancedSearch;
  }

  async getAccount(): Promise<any> {
    let query = `
      {
        account {
          plans {
            name
            productType
            status
            nextBillingPeriod
            availableCredits
            usedCredits
            costPerDataPoint {
              type
              cost
            }
          }
        }
      }
    `;

    let result = await this.graphql(query);
    return result.account;
  }

  async submitPersonFeedback(input: PersonFeedbackInput): Promise<any> {
    let query = `
      mutation SubmitPersonFeedback($input: ApiPersonFeedback!) {
        submitPersonFeedback(input: $input)
      }
    `;

    let result = await this.graphql(query, { input });
    return result.submitPersonFeedback;
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
  qualityFilter?: string;
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
  locations?: LocationFilterInput;
  containsWorkEmails?: string[];
  updatedAt?: DateRangeFilter;
  newHireFrom?: string;
  newPromotionFrom?: string;
}

export interface CompanyFilter {
  ids?: string[];
  names?: string[];
  domains?: string[];
  linkedinIds?: string[];
  industries?: string[];
  sizes?: CompanySizeFilter[];
  locations?: LocationFilterInput;
  descriptions?: string[];
  technologies?: string[];
  technologyCategories?: string[];
  revenueRanges?: RangeFilter[];
  fundingInfoFilters?: FundingInfoFilter[];
  naicsCodeFilters?: string[];
  sicCodeFilters?: string[];
}

export interface FlatSearchInput {
  companyFilter?: CompanyFilter;
  companyExcludedFilter?: CompanyFilter;
  contactFilter?: ContactFilter;
  contactExcludedFilter?: ContactFilter;
  skip?: number;
  limit?: number;
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
