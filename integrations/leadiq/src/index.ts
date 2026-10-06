import { Slate } from 'slates';
import { spec } from './spec';
import {
  advancedPeopleSearch,
  getAccountCredits,
  getCompanyList,
  listCompanyLists,
  manageCompanyList,
  searchCompany,
  searchContact,
  submitDataFeedback
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    searchContact,
    searchCompany,
    advancedPeopleSearch,
    getAccountCredits,
    submitDataFeedback,
    listCompanyLists,
    getCompanyList,
    manageCompanyList
  ],
  triggers: []
});
