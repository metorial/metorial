import { rejectUnavailableDelighted } from './unavailable';

/** Retained import boundary; the discontinued provider never receives credentials. */
export class Client {
  constructor(_config: { token: string }) {
    rejectUnavailableDelighted();
  }
}
