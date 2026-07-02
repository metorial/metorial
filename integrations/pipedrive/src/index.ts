import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  convertLeadToDeal,
  getActivities,
  getActivityTypes,
  getDeals,
  getFields,
  getLeads,
  getNotes,
  getOrganizations,
  getPersons,
  getPipelines,
  getProducts,
  getUsers,
  manageActivities,
  manageDealProducts,
  manageDeals,
  manageLeads,
  manageNotes,
  manageOrganizations,
  managePersons,
  managePipelines,
  manageProducts,
  searchPipedrive
} from './tools';
import {
  activityEvents,
  dealEvents,
  leadEvents,
  noteEvents,
  organizationEvents,
  personEvents,
  pipelineEvents,
  productEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageDeals.build(),
    getDeals.build(),
    manageLeads.build(),
    getLeads.build(),
    managePersons.build(),
    getPersons.build(),
    manageOrganizations.build(),
    getOrganizations.build(),
    manageActivities.build(),
    getActivities.build(),
    manageProducts.build(),
    getProducts.build(),
    manageNotes.build(),
    getNotes.build(),
    managePipelines.build(),
    getPipelines.build(),
    searchPipedrive.build(),
    manageDealProducts.build(),
    getUsers.build(),
    getFields.build(),
    getActivityTypes.build(),
    convertLeadToDeal.build()
  ],
  triggers: [
    dealEvents.build(),
    leadEvents.build(),
    personEvents.build(),
    organizationEvents.build(),
    activityEvents.build(),
    productEvents.build(),
    noteEvents.build(),
    pipelineEvents.build()
  ]
});
