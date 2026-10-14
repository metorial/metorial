import { Slate } from 'slates';
import { spec } from './spec';
import {
  addScore,
  createPlayer,
  createTeam,
  getPlayer,
  listCompetitions,
  listPlayers,
  listScoreHistory,
  listScoreSeries,
  listTeamPlayers,
  listTeams,
  manageTeamMembership,
  removePlayer,
  updatePlayer
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
    listCompetitions,
    getPlayer,
    updatePlayer,
    listTeamPlayers
  ],
  triggers: []
});
