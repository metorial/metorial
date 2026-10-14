import { Slate } from 'slates';
import { spec } from './spec';
import {
  getFeature,
  listEpics,
  listFeatures,
  listGoalsAndInitiatives,
  listIdeas,
  listProducts,
  listReleases,
  listUsers,
  manageComment,
  manageEpic,
  manageFeature,
  manageGoal,
  manageIdea,
  manageInitiative,
  manageRelease,
  manageTodo,
  whoAmI
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    whoAmI,
    listProducts,
    listFeatures,
    getFeature,
    manageFeature,
    listReleases,
    manageRelease,
    listEpics,
    manageEpic,
    listIdeas,
    manageIdea,
    manageGoal,
    manageInitiative,
    listGoalsAndInitiatives,
    manageComment,
    manageTodo,
    listUsers
  ],
  triggers: []
});
