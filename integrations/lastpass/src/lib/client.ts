import { createAxios } from 'slates';
import type {
  LastPassApiResponse,
  LastPassBatchAddUser,
  LastPassDeleteResponse,
  LastPassEvent,
  LastPassEventReportResponse,
  LastPassSharedFolder,
  LastPassUserDataResponse
} from './types';

export class LastPassClient {
  private companyId: string;
  private provisioningHash: string;

  constructor(params: { companyId: string; provisioningHash: string }) {
    this.companyId = params.companyId;
    this.provisioningHash = params.provisioningHash;
  }

  private async execute<T extends LastPassApiResponse>(cmd: string, data?: any): Promise<T> {
    let axios = createAxios({
      baseURL: 'https://lastpass.com',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    let body: Record<string, any> = {
      cid: this.companyId,
      provhash: this.provisioningHash,
      cmd
    };

    if (data !== undefined) {
      body.data = data;
    }

    let response = await axios.post('/enterpriseapi.php', body);
    let result = response.data as T;

    if (result.status && result.status !== 'OK' && result.status !== 'WARN') {
      let errorMsg = result.errors?.join(', ') || `API returned status: ${result.status}`;
      throw new Error(`LastPass API error (${cmd}): ${errorMsg}`);
    }

    return result;
  }

  // ─── User Data ──────────────────────────────────────────────────

  async getUserData(username?: string): Promise<LastPassUserDataResponse> {
    let data: Record<string, any> = {};
    if (username) {
      data.username = username;
    }
    return this.execute<LastPassUserDataResponse>('getuserdata', data);
  }

  async getUserDataPaginated(
    pageIndex: number,
    pageSize: number = 500
  ): Promise<LastPassUserDataResponse> {
    return this.execute<LastPassUserDataResponse>('getuserdata', {
      pagesize: pageSize,
      pageindex: pageIndex
    });
  }

  // ─── User Provisioning ─────────────────────────────────────────

  async batchAdd(users: LastPassBatchAddUser[]): Promise<LastPassApiResponse> {
    return this.execute<LastPassApiResponse>('batchadd', users);
  }

  // ─── User Deletion ─────────────────────────────────────────────

  async deleteUser(
    username: string,
    deleteAction: 0 | 1 | 2 = 0
  ): Promise<LastPassDeleteResponse> {
    return this.execute<LastPassDeleteResponse>('deluser', {
      username,
      deleteaction: deleteAction
    });
  }

  // ─── User Disable ──────────────────────────────────────────────

  async disableUser(username: string): Promise<LastPassApiResponse> {
    return this.execute<LastPassApiResponse>('disableuser', {
      username
    });
  }

  // ─── Password Management ───────────────────────────────────────

  async resetPassword(username: string): Promise<LastPassApiResponse> {
    return this.execute<LastPassApiResponse>('resetpassword', {
      username
    });
  }

  // ─── Multifactor ───────────────────────────────────────────────

  async disableMultifactor(username: string): Promise<LastPassApiResponse> {
    return this.execute<LastPassApiResponse>('disablemultifactor', {
      username
    });
  }

  // ─── Group Management ──────────────────────────────────────────

  async batchChangeGroup(
    users: Array<{
      username: string;
      add?: string[];
      del?: string[];
    }>
  ): Promise<LastPassApiResponse> {
    return this.execute<LastPassApiResponse>('batchchangegrp', users);
  }

  // ─── Shared Folders ────────────────────────────────────────────

  async getSharedFolderData(): Promise<Record<string, LastPassSharedFolder>> {
    let result = await this.execute<Record<string, any>>('getsfdata');
    // Remove status/errors fields to get just the shared folder data
    let folders: Record<string, LastPassSharedFolder> = {};
    for (let key of Object.keys(result)) {
      if (key !== 'status' && key !== 'errors') {
        folders[key] = result[key] as LastPassSharedFolder;
      }
    }
    return folders;
  }

  // ─── Event Reporting ───────────────────────────────────────────

  async getEventReport(params: {
    from: string;
    to: string;
    search?: string;
    user?: string;
  }): Promise<LastPassEvent[]> {
    let data: Record<string, any> = {
      from: params.from,
      to: params.to
    };

    if (params.search) {
      data.search = params.search;
    }
    if (params.user) {
      data.user = params.user;
    }

    let result = await this.execute<LastPassEventReportResponse>('reporting', data);

    let events: LastPassEvent[] = [];
    if (result.data && typeof result.data === 'object') {
      for (let key of Object.keys(result.data)) {
        events.push(result.data[key]!);
      }
    }

    return events;
  }
}
