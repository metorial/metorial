import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelStatement,
  checkStatementStatus,
  executeSql,
  manageDatabase,
  manageGrant,
  manageRole,
  manageSchema,
  manageTable,
  manageTask,
  manageUser,
  manageWarehouse
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    executeSql,
    checkStatementStatus,
    cancelStatement,
    manageDatabase,
    manageSchema,
    manageTable,
    manageWarehouse,
    manageUser,
    manageRole,
    manageTask,
    manageGrant
  ],
  triggers: []
});
