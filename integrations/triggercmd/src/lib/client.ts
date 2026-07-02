import { createAxios } from 'slates';

export interface TriggerCommandParams {
  computer: string;
  trigger: string;
  params?: string;
}

export interface Computer {
  _id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Command {
  _id: string;
  name: string;
  trigger?: string;
  voice?: string;
  voiceReply?: string;
  allowParams?: boolean;
  computer?: string;
  user?: string;
  switchIsOn?: boolean;
  runCount?: number;
  createdAt?: string;
  updatedAt?: string;
  lastResult?: string;
}

export interface RunRecord {
  _id: string;
  status: string;
  createdAt: string;
  command?: string;
}

export class Client {
  private http;

  constructor(private token: string) {
    this.http = createAxios({
      baseURL: 'https://www.triggercmd.com',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async triggerCommand(params: TriggerCommandParams): Promise<any> {
    let body: Record<string, string> = {
      computer: params.computer,
      trigger: params.trigger
    };
    if (params.params) {
      body.params = params.params;
    }
    let response = await this.http.post('/api/run/triggerSave', body);
    return response.data;
  }

  async listComputers(): Promise<Computer[]> {
    let response = await this.http.get('/api/computer/list');
    return response.data;
  }

  async listCommandsForComputer(computerId: string): Promise<Command[]> {
    let response = await this.http.post('/api/command/list', {
      computer_id: computerId
    });
    return response.data;
  }

  async listAllCommands(): Promise<Command[]> {
    let response = await this.http.get('/api/command/commandlist');
    return response.data;
  }

  async listRuns(commandId: string): Promise<{ records: RunRecord[] }> {
    let response = await this.http.get('/api/run/list', {
      params: {
        sortOn: 'createdAt,DESC',
        command_id: commandId,
        token: this.token
      }
    });
    return response.data;
  }
}
