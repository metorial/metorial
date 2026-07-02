import { createAxios } from 'slates';

export let encodeFormBody = (params: Record<string, string | undefined>): string => {
  let parts: string[] = [];
  for (let [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.join('&');
};

export class FlexClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://flex-api.twilio.com/v1',
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  async getConfiguration(): Promise<any> {
    let response = await this.axios.get('/Configuration');
    return response.data;
  }

  async updateConfiguration(params: Record<string, string | undefined>): Promise<any> {
    let response = await this.axios.post('/Configuration', encodeFormBody(params));
    return response.data;
  }

  async listFlexFlows(pageSize?: number): Promise<any> {
    let response = await this.axios.get('/FlexFlows', {
      params: { PageSize: pageSize || 50 }
    });
    return response.data;
  }

  async getFlexFlow(flexFlowSid: string): Promise<any> {
    let response = await this.axios.get(`/FlexFlows/${flexFlowSid}`);
    return response.data;
  }

  async createFlexFlow(params: Record<string, string | undefined>): Promise<any> {
    let response = await this.axios.post('/FlexFlows', encodeFormBody(params));
    return response.data;
  }

  async updateFlexFlow(
    flexFlowSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(`/FlexFlows/${flexFlowSid}`, encodeFormBody(params));
    return response.data;
  }

  async deleteFlexFlow(flexFlowSid: string): Promise<void> {
    await this.axios.delete(`/FlexFlows/${flexFlowSid}`);
  }

  async createInteraction(params: Record<string, string | undefined>): Promise<any> {
    let response = await this.axios.post('/Interactions', encodeFormBody(params));
    return response.data;
  }

  async getInteraction(interactionSid: string): Promise<any> {
    let response = await this.axios.get(`/Interactions/${interactionSid}`);
    return response.data;
  }

  async listInteractionChannels(interactionSid: string): Promise<any> {
    let response = await this.axios.get(`/Interactions/${interactionSid}/Channels`);
    return response.data;
  }

  async getInteractionChannel(interactionSid: string, channelSid: string): Promise<any> {
    let response = await this.axios.get(
      `/Interactions/${interactionSid}/Channels/${channelSid}`
    );
    return response.data;
  }

  async updateInteractionChannel(
    interactionSid: string,
    channelSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/Interactions/${interactionSid}/Channels/${channelSid}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async listInteractionChannelParticipants(
    interactionSid: string,
    channelSid: string
  ): Promise<any> {
    let response = await this.axios.get(
      `/Interactions/${interactionSid}/Channels/${channelSid}/Participants`
    );
    return response.data;
  }

  async createInteractionChannelParticipant(
    interactionSid: string,
    channelSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/Interactions/${interactionSid}/Channels/${channelSid}/Participants`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async updateInteractionChannelParticipant(
    interactionSid: string,
    channelSid: string,
    participantSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/Interactions/${interactionSid}/Channels/${channelSid}/Participants/${participantSid}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async createInteractionChannelInvite(
    interactionSid: string,
    channelSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/Interactions/${interactionSid}/Channels/${channelSid}/Invites`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async listInteractionChannelInvites(
    interactionSid: string,
    channelSid: string
  ): Promise<any> {
    let response = await this.axios.get(
      `/Interactions/${interactionSid}/Channels/${channelSid}/Invites`
    );
    return response.data;
  }
}
