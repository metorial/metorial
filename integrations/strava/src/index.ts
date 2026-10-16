import { Slate } from 'slates';
import { spec } from './spec';
import {
  createActivity,
  exploreSegments,
  getActivity,
  getActivityStreams,
  getAthleteProfile,
  getClub,
  getGear,
  getRoute,
  getRouteDetails,
  getSegment,
  getSegmentEffort,
  getSegmentEfforts,
  getSegmentStreams,
  listActivities,
  listActivityComments,
  listClubs,
  listRoutes,
  listStarredSegments,
  starSegment,
  updateActivity,
  updateAthlete
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getRouteDetails,
    listActivityComments,
    listStarredSegments,
    getSegmentEffort,
    getSegmentStreams,
    getAthleteProfile,
    updateAthlete,
    listActivities,
    getActivity,
    createActivity,
    updateActivity,
    getActivityStreams,
    exploreSegments,
    getSegment,
    starSegment,
    getSegmentEfforts,
    getRoute,
    listRoutes,
    getClub,
    listClubs,
    getGear
  ],
  triggers: []
});
