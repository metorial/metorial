import { createAxios } from 'slates';

export interface EventeeContent {
  eventName: string;
  eventDescription: string;
  eventStart: string;
  eventEnd: string;
  stages: EventeeStage[];
  tracks: EventeeTrack[];
  sessions: EventeeSession[];
  speakers: EventeeSpeaker[];
}

export interface EventeeStage {
  stageId: number;
  name: string;
  order: number;
}

export interface EventeeTrack {
  trackId: number;
  name: string;
  color: string;
}

export interface EventeeSession {
  sessionId: number;
  title: string;
  description: string;
  start: string;
  end: string;
  stageId: number;
  trackId: number | null;
  speakers: number[];
}

export interface EventeeSpeaker {
  speakerId: number;
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
  photoUrl: string;
  company: string;
  jobPosition: string;
}

export interface EventeeParticipant {
  participantId: number;
  email: string;
  firstName: string;
  lastName: string;
  photoUrl: string;
  phone: string;
  bio: string;
  webPage: string;
  facebookUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  jobPosition: string;
  company: string;
  checkedIn: boolean;
}

export interface EventeeRegistration {
  registrationId: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface InviteAttendeeUser {
  email: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  phone?: string;
  bio?: string;
  webPage?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  jobPosition?: string;
  company?: string;
  sendEmail?: boolean;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.eventee.com/public/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async getContent(): Promise<EventeeContent> {
    let response = await this.axios.get('/content');
    return response.data;
  }

  async listParticipants(): Promise<EventeeParticipant[]> {
    let response = await this.axios.get('/participants');
    return response.data;
  }

  async listRegistrations(): Promise<EventeeRegistration[]> {
    let response = await this.axios.get('/registrations');
    return response.data;
  }

  async inviteAttendees(
    users: InviteAttendeeUser[]
  ): Promise<{ invited: number; users: Record<string, unknown>[] }> {
    let payload = {
      users: users.map(user => ({
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        photo_url: user.photoUrl,
        phone: user.phone,
        biography: user.bio,
        web_page: user.webPage,
        facebook_url: user.facebookUrl,
        twitter_url: user.twitterUrl,
        linkedin_url: user.linkedinUrl,
        job_position: user.jobPosition,
        company: user.company,
        send_email: user.sendEmail
      }))
    };
    let response = await this.axios.put('/attendee/invite', payload);
    return response.data;
  }
}
