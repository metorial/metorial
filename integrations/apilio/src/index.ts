import { Slate } from 'slates';
import { spec } from './spec';
import {
  evaluateLogicblock,
  getCondition,
  getVariable,
  listBooleanVariables,
  listConditions,
  listLogicblocks,
  listNumericVariables,
  listStringVariables,
  manageLogicblock,
  updateBooleanVariable,
  updateNumericVariable,
  updateStringVariable
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listBooleanVariables,
    updateBooleanVariable,
    listStringVariables,
    updateStringVariable,
    listNumericVariables,
    updateNumericVariable,
    getVariable,
    listConditions,
    getCondition,
    listLogicblocks,
    evaluateLogicblock,
    manageLogicblock
  ],
  triggers: []
});
