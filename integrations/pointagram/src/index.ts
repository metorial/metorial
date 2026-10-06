import { Slate } from 'slates';
import { spec } from './spec';
import {
  addScore,
  createPlayer,
  createTeam,
  listCompetitions,
  listPlayers,
  listScoreHistory,
  listScoreSeries,
  listTeams,
  manageTeamMembership,
  removePlayer
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createPlayer,
    listPlayers,
    removePlayer,
    createTeam,
    listTeams,
    manageTeamMembership,
    addScore,
    listScoreSeries,
    listScoreHistory,
    listCompetitions
  ],
  triggers: []
});
