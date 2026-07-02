import { createAxios } from 'slates';
import { firefliesApiError } from './errors';

let httpClient = createAxios({
  baseURL: 'https://api.fireflies.ai'
});

let userGroupFields = `
  id
  name
  handle
  members {
    user_id
    first_name
    last_name
    email
  }
`;

let userFields = `
  user_id
  email
  name
  num_transcripts
  recent_meeting
  recent_transcript
  minutes_consumed
  is_admin
  integrations
  is_calendar_in_sync
  user_groups {
    ${userGroupFields}
  }
`;

let summaryFields = `
  keywords
  action_items
  outline
  shorthand_bullet
  overview
  notes
  bullet_gist
  gist
  short_summary
  short_overview
  meeting_type
  topics_discussed
  transcript_chapters
  extended_sections {
    title
    content
  }
`;

let analyticsFields = `
  sentiments {
    negative_pct
    neutral_pct
    positive_pct
  }
  categories {
    questions
    date_times
    metrics
    tasks
  }
  speakers {
    speaker_id
    name
    duration
    word_count
    longest_monologue
    monologues_count
    filler_words
    questions
    duration_pct
    words_per_minute
  }
`;

let appOutputFields = `
  transcript_id
  user_id
  app_id
  created_at
  title
  prompt
  response
`;

let channelFields = `
  id
  title
  is_private
  created_by
  created_at
  updated_at
  members {
    user_id
    email
    name
  }
`;

let transcriptListFields = `
  id
  title
  date
  duration
  organizer_email
  participants
  fireflies_users
  workspace_users
  privacy
  transcript_url
  audio_url
  video_url
  calendar_id
  cal_id
  calendar_type
  meeting_link
  is_live
  meeting_info {
    fred_joined
    silent_meeting
    summary_status
  }
  summary {
    ${summaryFields}
  }
  apps_preview {
    outputs {
      ${appOutputFields}
    }
  }
  channels {
    id
    title
  }
  shared_with {
    email
    name
    photo_url
    expires_at
  }
`;

let transcriptDetailFields = `
  ${transcriptListFields}
  host_email
  user {
    ${userFields}
  }
  speakers {
    id
    name
  }
  analytics {
    ${analyticsFields}
  }
  sentences {
    index
    text
    raw_text
    start_time
    end_time
    speaker_id
    speaker_name
    ai_filters {
      task
      pricing
      metric
      question
      date_and_time
      text_cleanup
      sentiment
    }
  }
  meeting_attendees {
    displayName
    email
    phoneNumber
    name
    location
  }
  meeting_attendance {
    name
    join_time
    leave_time
  }
`;

let biteFields = `
  transcript_id
  name
  id
  thumbnail
  preview
  status
  summary
  user_id
  start_time
  end_time
  summary_status
  media_type
  created_at
  created_from {
    description
    duration
    id
    name
    type
  }
  captions {
    end_time
    index
    speaker_id
    speaker_name
    start_time
    text
  }
  sources {
    src
    type
  }
  privacies
  user {
    first_name
    last_name
    picture
    name
    id
  }
`;

export type DownloadAuthInput =
  | { type: 'none' }
  | { type: 'bearer_token'; token: string }
  | { type: 'basic_auth'; username?: string; password: string };

export class FirefliesClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private async query<T = any>(
    graphqlQuery: string,
    variables?: Record<string, any>,
    operation = 'GraphQL request'
  ): Promise<T> {
    try {
      let response = await httpClient.post(
        '/graphql',
        {
          query: graphqlQuery,
          variables
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.errors && response.data.errors.length > 0) {
        throw firefliesApiError({ data: response.data }, operation);
      }

      return response.data.data as T;
    } catch (error) {
      throw firefliesApiError(error, operation);
    }
  }

  async getTranscripts(params?: {
    keyword?: string;
    scope?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    skip?: number;
    organizers?: string[];
    participants?: string[];
    userId?: string;
    mine?: boolean;
    channelId?: string;
  }) {
    let result = await this.query<{ transcripts: any[] }>(
      `
      query Transcripts(
        $keyword: String
        $scope: String
        $fromDate: DateTime
        $toDate: DateTime
        $limit: Int
        $skip: Int
        $organizers: [String!]
        $participants: [String!]
        $userId: String
        $mine: Boolean
        $channelId: String
      ) {
        transcripts(
          keyword: $keyword
          scope: $scope
          fromDate: $fromDate
          toDate: $toDate
          limit: $limit
          skip: $skip
          organizers: $organizers
          participants: $participants
          user_id: $userId
          mine: $mine
          channel_id: $channelId
        ) {
          ${transcriptListFields}
        }
      }
    `,
      params,
      'list transcripts'
    );

    return result.transcripts;
  }

  async getTranscript(transcriptId: string) {
    let result = await this.query<{ transcript: any }>(
      `
      query GetTranscript($id: String!) {
        transcript(id: $id) {
          ${transcriptDetailFields}
        }
      }
    `,
      { id: transcriptId },
      'get transcript'
    );

    return result.transcript;
  }

  async getSummary(transcriptId: string) {
    let result = await this.query<{ transcript: any }>(
      `
      query GetSummary($id: String!) {
        transcript(id: $id) {
          id
          title
          summary {
            ${summaryFields}
          }
        }
      }
    `,
      { id: transcriptId },
      'get summary'
    );

    return result.transcript;
  }

  async deleteTranscript(transcriptId: string) {
    let result = await this.query<{ deleteTranscript: any }>(
      `
      mutation DeleteTranscript($id: String!) {
        deleteTranscript(id: $id) {
          id
          title
          date
        }
      }
    `,
      { id: transcriptId },
      'delete transcript'
    );

    return result.deleteTranscript;
  }

  async updateMeetingTitle(transcriptId: string, title: string) {
    let result = await this.query<{ updateMeetingTitle: any }>(
      `
      mutation UpdateMeetingTitle($input: UpdateMeetingTitleInput!) {
        updateMeetingTitle(input: $input) {
          title
        }
      }
    `,
      { input: { id: transcriptId, title } },
      'update meeting title'
    );

    return result.updateMeetingTitle;
  }

  async updateMeetingPrivacy(transcriptId: string, privacy: string) {
    let result = await this.query<{ updateMeetingPrivacy: any }>(
      `
      mutation UpdateMeetingPrivacy($input: UpdateMeetingPrivacyInput!) {
        updateMeetingPrivacy(input: $input) {
          id
          title
          privacy
        }
      }
    `,
      { input: { id: transcriptId, privacy } },
      'update meeting privacy'
    );

    return result.updateMeetingPrivacy;
  }

  async updateMeetingChannel(transcriptIds: string[], channelId: string) {
    let result = await this.query<{ updateMeetingChannel: any[] }>(
      `
      mutation UpdateMeetingChannel($input: UpdateMeetingChannelInput!) {
        updateMeetingChannel(input: $input) {
          id
          title
          channels {
            id
            title
          }
        }
      }
    `,
      { input: { transcript_ids: transcriptIds, channel_id: channelId } },
      'update meeting channel'
    );

    return result.updateMeetingChannel;
  }

  async uploadAudio(params: {
    url: string;
    title?: string;
    webhook?: string;
    customLanguage?: string;
    attendees?: Array<{ displayName?: string; email?: string; phoneNumber?: string }>;
    clientReferenceId?: string;
    bypassSizeCheck?: boolean;
    saveVideo?: boolean;
    downloadAuth?: DownloadAuthInput;
  }) {
    let downloadAuth =
      !params.downloadAuth || params.downloadAuth.type === 'none'
        ? undefined
        : params.downloadAuth.type === 'bearer_token'
          ? { type: 'bearer_token', bearer: { token: params.downloadAuth.token } }
          : {
              type: 'basic_auth',
              basic: {
                username: params.downloadAuth.username,
                password: params.downloadAuth.password
              }
            };

    let result = await this.query<{ uploadAudio: any }>(
      `
      mutation UploadAudio($input: AudioUploadInput) {
        uploadAudio(input: $input) {
          success
          title
          message
        }
      }
    `,
      {
        input: {
          url: params.url,
          title: params.title,
          webhook: params.webhook,
          custom_language: params.customLanguage,
          save_video: params.saveVideo,
          attendees: params.attendees,
          client_reference_id: params.clientReferenceId,
          bypass_size_check: params.bypassSizeCheck,
          download_auth: downloadAuth
        }
      },
      'upload audio'
    );

    return result.uploadAudio;
  }

  async getUser(userId?: string) {
    let result = await this.query<{ user: any }>(
      `
      query User($id: String) {
        user(id: $id) {
          ${userFields}
        }
      }
    `,
      { id: userId },
      'get user'
    );

    return result.user;
  }

  async getUsers() {
    let result = await this.query<{ users: any[] }>(
      `
      query Users {
        users {
          ${userFields}
        }
      }
    `,
      undefined,
      'list users'
    );

    return result.users;
  }

  async getUserGroups(params?: { mine?: boolean }) {
    let result = await this.query<{ user_groups: any[] }>(
      `
      query UserGroups($mine: Boolean) {
        user_groups(mine: $mine) {
          ${userGroupFields}
        }
      }
    `,
      { mine: params?.mine },
      'list user groups'
    );

    return result.user_groups;
  }

  async getContacts() {
    let result = await this.query<{ contacts: any[] }>(
      `
      query Contacts {
        contacts {
          email
          name
          picture
          last_meeting_date
        }
      }
    `,
      undefined,
      'list contacts'
    );

    return result.contacts;
  }

  async setUserRole(userId: string, role: string) {
    let result = await this.query<{ setUserRole: any }>(
      `
      mutation SetUserRole($userId: String!, $role: Role!) {
        setUserRole(user_id: $userId, role: $role) {
          id
          name
          email
          role
        }
      }
    `,
      { userId, role },
      'set user role'
    );

    return result.setUserRole;
  }

  async addToLiveMeeting(params: {
    meetingLink: string;
    title?: string;
    meetingPassword?: string;
    duration?: number;
    language?: string;
    attendees?: Array<{ displayName?: string; email?: string; phoneNumber?: string }>;
  }) {
    let result = await this.query<{ addToLiveMeeting: any }>(
      `
      mutation AddToLive(
        $meetingLink: String!
        $title: String
        $meetingPassword: String
        $duration: Int
        $language: String
        $attendees: [Attendee]
      ) {
        addToLiveMeeting(
          meeting_link: $meetingLink
          title: $title
          meeting_password: $meetingPassword
          duration: $duration
          language: $language
          attendees: $attendees
        ) {
          success
        }
      }
    `,
      {
        meetingLink: params.meetingLink,
        title: params.title,
        meetingPassword: params.meetingPassword,
        duration: params.duration,
        language: params.language,
        attendees: params.attendees
      },
      'add to live meeting'
    );

    return result.addToLiveMeeting;
  }

  async getActiveMeetings(params?: { email?: string; states?: string[] }) {
    let result = await this.query<{ active_meetings: any[] }>(
      `
      query ActiveMeetings($email: String, $states: [MeetingState!]) {
        active_meetings(input: { email: $email, states: $states }) {
          id
          title
          organizer_email
          meeting_link
          start_time
          end_time
          privacy
          state
        }
      }
    `,
      {
        email: params?.email,
        states: params?.states
      },
      'list active meetings'
    );

    return result.active_meetings;
  }

  async updateMeetingState(meetingId: string, action: string) {
    let result = await this.query<{ updateMeetingState: any }>(
      `
      mutation UpdateMeetingState($input: UpdateMeetingStateInput!) {
        updateMeetingState(input: $input) {
          success
          action
        }
      }
    `,
      { input: { meeting_id: meetingId, action } },
      'update meeting state'
    );

    return result.updateMeetingState;
  }

  async createLiveActionItem(meetingId: string, prompt: string) {
    let result = await this.query<{ createLiveActionItem: any }>(
      `
      mutation CreateLiveActionItem($input: CreateLiveActionItemInput!) {
        createLiveActionItem(input: $input) {
          success
        }
      }
    `,
      { input: { meeting_id: meetingId, prompt } },
      'create live action item'
    );

    return result.createLiveActionItem;
  }

  async createLiveSoundbite(meetingId: string, prompt: string) {
    let result = await this.query<{ createLiveSoundbite: any }>(
      `
      mutation CreateLiveSoundbite($input: CreateLiveSoundbiteInput!) {
        createLiveSoundbite(input: $input) {
          success
        }
      }
    `,
      { input: { meeting_id: meetingId, prompt } },
      'create live soundbite'
    );

    return result.createLiveSoundbite;
  }

  async getLiveActionItems(meetingId: string) {
    let result = await this.query<{ live_action_items: any[] }>(
      `
      query LiveActionItems($meetingId: ID!) {
        live_action_items(meeting_id: $meetingId) {
          name
          action_item
        }
      }
    `,
      { meetingId },
      'list live action items'
    );

    return result.live_action_items;
  }

  async createBite(params: {
    transcriptId: string;
    startTime: number;
    endTime: number;
    name?: string;
    mediaType?: string;
    privacies?: string[];
    summary?: string;
  }) {
    let result = await this.query<{ createBite: any }>(
      `
      mutation CreateBite(
        $transcriptId: ID!
        $startTime: Float!
        $endTime: Float!
        $name: String
        $mediaType: String
        $privacies: [BitePrivacy!]
        $summary: String
      ) {
        createBite(
          transcript_Id: $transcriptId
          start_time: $startTime
          end_time: $endTime
          name: $name
          media_type: $mediaType
          privacies: $privacies
          summary: $summary
        ) {
          id
          name
          status
          summary
        }
      }
    `,
      {
        transcriptId: params.transcriptId,
        startTime: params.startTime,
        endTime: params.endTime,
        name: params.name,
        mediaType: params.mediaType,
        privacies: params.privacies,
        summary: params.summary
      },
      'create bite'
    );

    return result.createBite;
  }

  async getBites(params: {
    mine?: boolean;
    transcriptId?: string;
    myTeam?: boolean;
    limit?: number;
    skip?: number;
  }) {
    let result = await this.query<{ bites: any[] }>(
      `
      query Bites(
        $mine: Boolean
        $transcriptId: ID
        $myTeam: Boolean
        $limit: Int
        $skip: Int
      ) {
        bites(
          mine: $mine
          transcript_id: $transcriptId
          my_team: $myTeam
          limit: $limit
          skip: $skip
        ) {
          ${biteFields}
        }
      }
    `,
      params,
      'list soundbites'
    );

    return result.bites;
  }

  async getBite(biteId: string) {
    let result = await this.query<{ bite: any }>(
      `
      query Bite($id: ID!) {
        bite(id: $id) {
          ${biteFields}
        }
      }
    `,
      { id: biteId },
      'get soundbite'
    );

    return result.bite;
  }

  async getChannels() {
    let result = await this.query<{ channels: any[] }>(
      `
      query Channels {
        channels {
          ${channelFields}
        }
      }
    `,
      undefined,
      'list channels'
    );

    return result.channels;
  }

  async getChannel(channelId: string) {
    let result = await this.query<{ channel: any }>(
      `
      query Channel($id: ID!) {
        channel(id: $id) {
          ${channelFields}
        }
      }
    `,
      { id: channelId },
      'get channel'
    );

    return result.channel;
  }

  async getAskFredThreads(transcriptId?: string) {
    let result = await this.query<{ askfred_threads: any[] }>(
      `
      query AskFredThreads($transcriptId: String) {
        askfred_threads(transcript_id: $transcriptId) {
          id
          title
          transcript_id
          user_id
          created_at
        }
      }
    `,
      { transcriptId },
      'list AskFred threads'
    );

    return result.askfred_threads;
  }

  async getAskFredThread(threadId: string) {
    let result = await this.query<{ askfred_thread: any }>(
      `
      query GetAskFredThread($id: String!) {
        askfred_thread(id: $id) {
          id
          title
          transcript_id
          user_id
          created_at
          messages {
            id
            thread_id
            query
            answer
            suggested_queries
            status
            created_at
            updated_at
          }
        }
      }
    `,
      { id: threadId },
      'get AskFred thread'
    );

    return result.askfred_thread;
  }

  async createAskFredThread(params: {
    query: string;
    transcriptId?: string;
    filters?: {
      startTime?: string;
      endTime?: string;
      channelIds?: string[];
      organizers?: string[];
      participants?: string[];
      transcriptIds?: string[];
    };
    responseLanguage?: string;
    formatMode?: string;
  }) {
    let input: Record<string, any> = {
      query: params.query
    };

    if (params.transcriptId) input.transcript_id = params.transcriptId;
    if (params.responseLanguage) input.response_language = params.responseLanguage;
    if (params.formatMode) input.format_mode = params.formatMode;

    if (params.filters) {
      let filters: Record<string, any> = {};
      if (params.filters.startTime) filters.start_time = params.filters.startTime;
      if (params.filters.endTime) filters.end_time = params.filters.endTime;
      if (params.filters.channelIds) filters.channel_ids = params.filters.channelIds;
      if (params.filters.organizers) filters.organizers = params.filters.organizers;
      if (params.filters.participants) filters.participants = params.filters.participants;
      if (params.filters.transcriptIds) filters.transcript_ids = params.filters.transcriptIds;
      input.filters = filters;
    }

    let result = await this.query<{ createAskFredThread: any }>(
      `
      mutation CreateAskFredThread($input: CreateAskFredThreadInput!) {
        createAskFredThread(input: $input) {
          message {
            id
            thread_id
            query
            answer
            suggested_queries
            status
            created_at
          }
        }
      }
    `,
      { input },
      'create AskFred thread'
    );

    return result.createAskFredThread;
  }

  async continueAskFredThread(params: {
    threadId: string;
    query: string;
    responseLanguage?: string;
    formatMode?: string;
  }) {
    let input: Record<string, any> = {
      thread_id: params.threadId,
      query: params.query
    };

    if (params.responseLanguage) input.response_language = params.responseLanguage;
    if (params.formatMode) input.format_mode = params.formatMode;

    let result = await this.query<{ continueAskFredThread: any }>(
      `
      mutation ContinueAskFredThread($input: ContinueAskFredThreadInput!) {
        continueAskFredThread(input: $input) {
          message {
            id
            thread_id
            query
            answer
            suggested_queries
            status
            created_at
          }
        }
      }
    `,
      { input },
      'continue AskFred thread'
    );

    return result.continueAskFredThread;
  }

  async deleteAskFredThread(threadId: string) {
    let result = await this.query<{ deleteAskFredThread: any }>(
      `
      mutation DeleteAskFredThread($id: String!) {
        deleteAskFredThread(id: $id) {
          id
          title
          transcript_id
          user_id
          created_at
        }
      }
    `,
      { id: threadId },
      'delete AskFred thread'
    );

    return result.deleteAskFredThread;
  }

  async shareMeeting(params: { meetingId: string; emails: string[]; expiryDays?: number }) {
    let result = await this.query<{ shareMeeting: any }>(
      `
      mutation ShareMeeting($input: ShareMeetingInput!) {
        shareMeeting(input: $input) {
          success
          message
        }
      }
    `,
      {
        input: {
          meeting_id: params.meetingId,
          emails: params.emails,
          expiry_days: params.expiryDays
        }
      },
      'share meeting'
    );

    return result.shareMeeting;
  }

  async revokeSharedMeetingAccess(meetingId: string, email: string) {
    let result = await this.query<{ revokeSharedMeetingAccess: any }>(
      `
      mutation RevokeSharedMeetingAccess($input: RevokeSharedMeetingAccessInput!) {
        revokeSharedMeetingAccess(input: $input) {
          success
          message
        }
      }
    `,
      {
        input: {
          meeting_id: meetingId,
          email
        }
      },
      'revoke meeting access'
    );

    return result.revokeSharedMeetingAccess;
  }

  async getAiApps(params?: {
    appId?: string;
    transcriptId?: string;
    limit?: number;
    skip?: number;
  }) {
    let result = await this.query<{ apps: any }>(
      `
      query GetAIAppsOutputs($appId: String, $transcriptId: String, $skip: Float, $limit: Float) {
        apps(app_id: $appId, transcript_id: $transcriptId, skip: $skip, limit: $limit) {
          outputs {
            ${appOutputFields}
          }
        }
      }
    `,
      {
        appId: params?.appId,
        transcriptId: params?.transcriptId,
        limit: params?.limit,
        skip: params?.skip
      },
      'get AI app results'
    );

    return result.apps;
  }

  async getAnalytics(params?: { startTime?: string; endTime?: string }) {
    let result = await this.query<{ analytics: any }>(
      `
      query Analytics($startTime: String, $endTime: String) {
        analytics(start_time: $startTime, end_time: $endTime) {
          team {
            conversation {
              average_filler_words
              average_filler_words_diff_pct
              average_monologues_count
              average_monologues_count_diff_pct
              average_questions
              average_questions_diff_pct
              average_sentiments {
                negative_pct
                neutral_pct
                positive_pct
              }
              average_silence_duration
              average_talk_listen_ratio
              average_words_per_minute
              total_filler_words
              total_questions
              total_silence_duration
              teammates_count
            }
            meeting {
              count
              count_diff_pct
              duration
              duration_diff_pct
              average_count
              average_duration
            }
          }
          users {
            user_id
            user_name
            user_email
            conversation {
              talk_listen_pct
              talk_listen_ratio
              total_silence_duration
              total_speak_duration
              total_word_count
              user_filler_words
              user_questions
              user_speak_duration
              user_word_count
              user_words_per_minute
            }
            meeting {
              count
              count_diff
              count_diff_compared_to
              count_diff_pct
              duration
              duration_diff
              duration_diff_compared_to
              duration_diff_pct
            }
          }
        }
      }
    `,
      params,
      'get analytics'
    );

    return result.analytics;
  }
}
