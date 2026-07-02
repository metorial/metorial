# Slates Specification for Bolt Iot

## Overview

Bolt IoT is an integrated IoT platform that offers a WiFi chip to connect actuators and sensors to the Internet. Users can configure the system over the Bolt Cloud to receive, store, and visualize data over graphs, and connect actuators such as motors and light bulbs to control them remotely. The platform also supports deploying machine learning algorithms to detect anomalies and predict sensor values.

## Authentication

Bolt IoT uses **API key** authentication.

- To generate an API key, go to the Bolt Cloud control panel (cloud.boltiot.com) and click on "Generate New API Key." You can also enable and disable the API key from the same panel.
- If the API key status is disabled, all API requests will be aborted by the server.
- The API key is included directly in the request URL path. The general syntax is: `https://cloud.boltiot.com/remote/{your_api_key}/{command}?param1=...&deviceName=BOLTXXXXXX`
- In addition to the API key, each request requires a **Device Name** (device ID) in the format `BOLTXXXXXXX`, which identifies the specific hardware device to interact with.
- There is no OAuth flow; the API key is the sole authentication mechanism.

## Features

### Device Management

- List all devices associated with your account via the `getDevices` endpoint.
- Check if a specific Bolt IoT device is online or offline (alive/dead status).
- Query the firmware and hardware version of a device.
- Restart a device remotely.

### Digital GPIO Control

- Set a digital pin high (5V) or low (0V) on a specified Bolt device.
- Read the current digital state of any GPIO pin (pins 0–7 and A0–A3).
- Useful for controlling LEDs, relays, motors, and other on/off actuators.

### Analog I/O

- Read the analog value from a specified pin on a Bolt device (e.g., for sensors like temperature or light). The analog pin A0 returns values from 0 to 1023.
- Write an analog (PWM) value (0–255) to output pins 1–5, enabling variable control of devices like motors or dimmable LEDs.

### UART / Serial Communication

- Perform actions like reading sensor values, controlling actuators, checking device status, and managing UART communication.
- Initialize the UART interface at a specified baud rate (supported rates: 9600, 115200, etc., selected by index 0–3).
- Send string data over the serial TX line to connected microcontrollers (e.g., Arduino).
- Read data received over the serial RX line.
- Send serial commands and immediately capture device responses in one seamless step, enabling complex automation workflows.
- This enables interfacing the Bolt WiFi module with external microcontrollers like Arduino for more complex projects.

### Data Collection and Visualization

- Remotely configure, monitor, and control devices via the Bolt Cloud.
- Configure the system over the Bolt Cloud to receive, store, and visualize data over graphs.
- The Cloud can poll devices for data at configurable intervals (e.g., every 5 minutes on the free plan, every 30 seconds on Pro).

### Machine Learning

- Deploy machine learning algorithms with a few clicks to detect anomalies as well as predict sensor values.
- This feature is configured through the Bolt Cloud dashboard, not directly via the REST API.

### Alerts

- Utilize Bolt's alert system providing information sent directly to your phone or email. You can configure the contact details and set the threshold.
- Alerts are configured through the Bolt Cloud dashboard.

## Events

The provider does not support webhooks or event subscription mechanisms through its API. The Bolt Cloud platform does support periodic data polling from devices at configured intervals, but there is no webhook or purpose-built push event system available for external consumers to subscribe to device events programmatically.
