import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteCompany,
  deleteProfile,
  getProfile,
  listCompanies,
  listExperiences,
  listMicrosurveys,
  listSegments,
  listSurveyResponses,
  listTags,
  listTourInteractions,
  listTours,
  manageDeliveries,
  manageDomains,
  manageEnvironments,
  manageWebhooks,
  searchProfiles,
  updateExperience,
  updateMicrosurvey,
  updateTour
} from './tools';
import { helpbarEvents, microsurveyEvents, tourEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchProfiles,
    getProfile,
    deleteProfile,
    listCompanies,
    deleteCompany,
    listTours,
    updateTour,
    listMicrosurveys,
    updateMicrosurvey,
    listSurveyResponses,
    listSegments,
    listTourInteractions,
    manageDeliveries,
    listExperiences,
    updateExperience,
    manageDomains,
    manageEnvironments,
    manageWebhooks,
    listTags
  ],
  triggers: [tourEvents, microsurveyEvents, helpbarEvents]
});
