import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import {
  createMember,
  createPasswordlessMember,
  deleteMember,
  getDataTable,
  getMember,
  listDataTables,
  listMembers,
  manageDataRecord,
  manageMemberPlan,
  queryDataRecords,
  updateMember,
  verifyToken
} from './tools';
export let provider = Slate.create({
  spec,
  toolCategories,
  tools: [
    listMembers,
    getMember,
    createMember,
    createPasswordlessMember,
    updateMember,
    deleteMember,
    manageMemberPlan,
    listDataTables,
    getDataTable,
    queryDataRecords,
    manageDataRecord,
    verifyToken
  ],
  triggers: []
});
