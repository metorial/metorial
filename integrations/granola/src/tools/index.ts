export { getMeetingTranscript } from './get-meeting-transcript';
export { getMeetings } from './get-meetings';
export { listMeetingFolders } from './list-meeting-folders';
export { listMeetings } from './list-meetings';

import { getMeetingTranscript } from './get-meeting-transcript';
import { getMeetings } from './get-meetings';
import { listMeetingFolders } from './list-meeting-folders';
import { listMeetings } from './list-meetings';

export const tools = [listMeetingFolders, listMeetings, getMeetings, getMeetingTranscript];
