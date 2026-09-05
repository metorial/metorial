import { exportCohortMembersTool } from './export-cohort-members';
import { queryRealtimeUsersTool } from './query-realtime-users';
import { queryRevenueLtvTool } from './query-revenue-ltv';
import { exportSessionReplayTool, listSessionReplaysTool } from './session-replays';
import { getUserActivityTool, searchUsersTool } from './user-investigation';

export const amplitudeProjectAnalyticsTools = [
  searchUsersTool,
  getUserActivityTool,
  listSessionReplaysTool,
  exportSessionReplayTool,
  exportCohortMembersTool,
  queryRevenueLtvTool,
  queryRealtimeUsersTool
];
