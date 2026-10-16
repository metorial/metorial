import { toolCategory } from 'slates';
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

export let toolCategories = [
  toolCategory({
    key: 'members',
    name: 'Members',
    description:
      'Member accounts, authentication tokens, profile data, and free plan connections.',
    tools: [
      listMembers,
      getMember,
      createMember,
      createPasswordlessMember,
      updateMember,
      deleteMember,
      manageMemberPlan,
      verifyToken
    ]
  }),
  toolCategory({
    key: 'data_tables',
    name: 'Data Tables',
    description:
      'Discover data table definitions and query, create, update, or delete their records.',
    tools: [listDataTables, getDataTable, queryDataRecords, manageDataRecord]
  })
];
