export const companiesHouseToolKeys = [
  'search_companies',
  'search_companies_advanced',
  'get_company_profile'
] as const;

export { getCompanyProfile } from './company-profile';
export { searchCompanies, searchCompaniesAdvanced } from './search-companies';

import { getCompanyProfile } from './company-profile';
import { searchCompanies, searchCompaniesAdvanced } from './search-companies';

export const tools = [searchCompanies, searchCompaniesAdvanced, getCompanyProfile];
