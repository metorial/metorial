import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteAccessTool,
  deleteUsersTool,
  enableChapterAccessTool,
  findUserTool,
  getCourseProgressTool,
  getExamResultsTool,
  getLoginTokenTool,
  getSchoolTool,
  grantAccessTool,
  listCoursesTool,
  listExamsTool,
  listOffersTool,
  listUsersTool,
  manageAccessTool,
  manageCustomPropertiesTool,
  setOfferExpirationTool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listUsersTool,
    findUserTool,
    grantAccessTool,
    manageAccessTool,
    deleteAccessTool,
    deleteUsersTool,
    listCoursesTool,
    listExamsTool,
    listOffersTool,
    getCourseProgressTool,
    manageCustomPropertiesTool,
    enableChapterAccessTool,
    getExamResultsTool,
    getLoginTokenTool,
    getSchoolTool,
    setOfferExpirationTool
  ],
  triggers: []
});
