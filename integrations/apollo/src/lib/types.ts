export interface ApolloContact {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  email_status?: string;
  title?: string;
  phone_numbers?: Array<{ raw_number?: string; sanitized_number?: string; type?: string }>;
  organization_name?: string;
  organization_id?: string;
  account_id?: string;
  owner_id?: string;
  contact_stage_id?: string;
  linkedin_url?: string;
  website_url?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  label_ids?: string[];
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface ApolloPerson {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  email?: string;
  email_status?: string;
  linkedin_url?: string;
  headline?: string;
  photo_url?: string;
  city?: string;
  state?: string;
  country?: string;
  organization_id?: string;
  organization?: ApolloOrganization;
  seniority?: string;
  departments?: string[];
  employment_history?: Array<{
    organization_name?: string;
    title?: string;
    start_date?: string;
    end_date?: string;
    current?: boolean;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export interface ApolloOrganization {
  id?: string;
  name?: string;
  website_url?: string;
  domain?: string;
  linkedin_url?: string;
  phone?: string;
  founded_year?: number;
  industry?: string;
  keywords?: string[];
  estimated_num_employees?: number;
  annual_revenue?: number;
  annual_revenue_printed?: string;
  technology_names?: string[];
  city?: string;
  state?: string;
  country?: string;
  short_description?: string;
  logo_url?: string;
  [key: string]: any;
}

export interface ApolloNewsArticle {
  id?: string;
  title?: string;
  url?: string;
  source_name?: string;
  source_url?: string;
  summary?: string;
  description?: string;
  category?: string;
  categories?: string[];
  published_at?: string;
  organization_id?: string;
  organization_name?: string;
  organization?: ApolloOrganization;
  [key: string]: any;
}

export interface ApolloAccount {
  id?: string;
  name?: string;
  domain?: string;
  website_url?: string;
  phone?: string;
  owner_id?: string;
  account_stage_id?: string;
  organization_id?: string;
  industry?: string;
  linkedin_url?: string;
  city?: string;
  state?: string;
  country?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface ApolloDeal {
  id?: string;
  name?: string;
  amount?: number;
  closed_date?: string;
  owner_id?: string;
  account_id?: string;
  deal_stage_id?: string;
  opportunity_stage_id?: string;
  stage_name?: string;
  status?: string;
  source?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface ApolloSequence {
  id?: string;
  name?: string;
  active?: boolean;
  created_at?: string;
  num_steps?: number;
  user_id?: string;
  label_ids?: string[];
  [key: string]: any;
}

export interface ApolloTask {
  id?: string;
  type?: string;
  status?: string;
  priority?: string;
  due_at?: string;
  title?: string;
  note?: string;
  user_id?: string;
  contact_id?: string;
  account_id?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  [key: string]: any;
}

export interface ApolloUser {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  image_url?: string;
  team_id?: string;
  [key: string]: any;
}

export interface PaginatedResponse<_T> {
  [key: string]: any;
  pagination?: {
    page?: number;
    per_page?: number;
    total_entries?: number;
    total_pages?: number;
  };
}

export interface PeopleSearchFilters {
  personTitles?: string[];
  personLocations?: string[];
  personSeniorities?: string[];
  organizationDomains?: string[];
  organizationLocations?: string[];
  organizationNumEmployeesRanges?: string[];
  organizationIndustryTagIds?: string[];
  qKeywords?: string;
  page?: number;
  perPage?: number;
}

export interface OrganizationSearchFilters {
  organizationDomains?: string[];
  organizationNumEmployeesRanges?: string[];
  organizationLocations?: string[];
  organizationNotLocations?: string[];
  organizationIndustryTagIds?: string[];
  organizationIds?: string[];
  qOrganizationKeywordTags?: string[];
  qOrganizationName?: string;
  revenueRange?: {
    min?: number;
    max?: number;
  };
  currentlyUsingAnyTechnologyUids?: string[];
  organizationJobTitles?: string[];
  organizationJobLocations?: string[];
  page?: number;
  perPage?: number;
}

export interface NewsArticleSearchFilters {
  organizationIds: string[];
  categories?: string[];
  publishedAtMin?: string;
  publishedAtMax?: string;
  page?: number;
  perPage?: number;
}

export interface PersonEnrichmentParams {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  domain?: string;
  organizationName?: string;
  linkedinUrl?: string;
  apolloId?: string;
  revealPersonalEmails?: boolean;
  revealPhoneNumber?: boolean;
}

export interface BulkPersonEnrichmentParams {
  details: Array<{
    first_name?: string;
    last_name?: string;
    name?: string;
    email?: string;
    domain?: string;
    organization_name?: string;
    linkedin_url?: string;
    id?: string;
  }>;
  revealPersonalEmails?: boolean;
  revealPhoneNumber?: boolean;
}
