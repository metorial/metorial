import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCharge,
  createDatapoint,
  createGoal,
  deleteDatapoint,
  getGoal,
  getUser,
  listDatapoints,
  listGoals,
  manageGoal,
  updateDatapoint,
  updateGoal
} from './tools';
import { goalDerailReminder, goalUpdated } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getUser,
    listGoals,
    getGoal,
    createGoal,
    updateGoal,
    manageGoal,
    createDatapoint,
    listDatapoints,
    updateDatapoint,
    deleteDatapoint,
    createCharge
  ],
  triggers: [goalDerailReminder, goalUpdated]
});
