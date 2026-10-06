import { Slate } from 'slates';
import { spec } from './spec';
import {
  createOrUpdateQuestion,
  getExamResults,
  getQuestions,
  listCategories,
  listGroupsAndLinks,
  manageAccessList,
  manageCategory
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listGroupsAndLinks,
    getExamResults,
    listCategories,
    manageCategory,
    getQuestions,
    createOrUpdateQuestion,
    manageAccessList
  ],
  triggers: []
});
