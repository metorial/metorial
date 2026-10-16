import { Slate } from 'slates';
import { spec } from './spec';
import {
  analogRead,
  analogWrite,
  digitalRead,
  digitalWrite,
  getDeviceOnlineStatus,
  getDeviceStatus,
  getDeviceVersion,
  listDevices,
  restartDevice,
  servoControl,
  uartCommunicate
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listDevices,
    getDeviceStatus,
    getDeviceOnlineStatus,
    getDeviceVersion,
    restartDevice,
    digitalWrite,
    digitalRead,
    analogRead,
    analogWrite,
    servoControl,
    uartCommunicate
  ],
  triggers: []
});
