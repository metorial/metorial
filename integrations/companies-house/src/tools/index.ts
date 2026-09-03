export const companiesHouseToolKeys = [
  'search_companies',
  'search_companies_advanced',
  'get_company_profile',
  'search_officers',
  'list_company_officers',
  'list_officer_appointments',
  'search_disqualified_officers',
  'get_officer_disqualifications'
] as const;

export { getCompanyProfile } from './company-profile';
export { getOfficerDisqualifications, searchDisqualifiedOfficers } from './disqualifications';
export { listCompanyOfficers, listOfficerAppointments, searchOfficers } from './officers';
export { searchCompanies, searchCompaniesAdvanced } from './search-companies';

import { getCompanyProfile } from './company-profile';
import { getOfficerDisqualifications, searchDisqualifiedOfficers } from './disqualifications';
import { listCompanyOfficers, listOfficerAppointments, searchOfficers } from './officers';
import { searchCompanies, searchCompaniesAdvanced } from './search-companies';

export const tools = [
  searchCompanies,
  searchCompaniesAdvanced,
  getCompanyProfile,
  searchOfficers,
  listCompanyOfficers,
  listOfficerAppointments,
  searchDisqualifiedOfficers,
  getOfficerDisqualifications
];
