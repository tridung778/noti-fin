# Noti-Fin - MoMo Payment Notification App

A React Native application that connects to Bluetooth speakers to audibly announce MoMo e-wallet payment notifications.

## Features

- Connects to real Bluetooth speakers for audio announcements
- Detects payment notifications (demo mode)
- Announces payment details through connected speaker
- Tracks received payment notifications
- User-friendly interface for managing speaker connections

## Installation

1. Clone the repository

   ```
   git clone https://github.com/yourusername/noti-fin.git
   cd noti-fin
   ```

2. Install dependencies

   ```
   npm install
   ```

3. Install development client

   ```
   npx expo install expo-dev-client
   ```

4. Build the app

   ```
   npx expo prebuild
   ```

5. Run on a real device (recommended)
   ```
   npx expo run:android
   ```

## How to Connect a Bluetooth Speaker

1. Make sure your Bluetooth speaker is turned on and in pairing mode
2. On your Android device, first pair the speaker in the Bluetooth settings
3. Open the Noti-Fin app
4. Tap "Show Bluetooth Devices" to see your paired devices
5. Select your Bluetooth speaker from the list to connect
6. Tap "Test Speaker" to verify that audio works correctly

## Notification Integration

This app can work in two modes:

### Demo Mode

- Demonstrates how the app would work with real notifications
- Use "Demo Payment" to simulate receiving a payment notification
- The app will announce the payment through the connected Bluetooth speaker

### Real Implementation

- Real Bluetooth speaker connections
- On first run, the app will request notification access permissions
- For Android, you'll need to manually enable notification access in system settings
- App will audibly announce MoMo payment notifications when they arrive

## Troubleshooting Bluetooth

If you have trouble connecting to your Bluetooth speaker:

1. Make sure the speaker is powered on and fully charged
2. Ensure the speaker is in pairing mode (check your speaker's manual)
3. Pair the speaker in your Android system settings first
4. Check that your Android device has Bluetooth enabled
5. Some speakers may require you to press a specific button to accept connections
6. Try rebooting both the speaker and your phone if connection fails
7. Make sure you are within range (typically 30 feet/10 meters) of the speaker

## Notification Permission

For notification detection to work properly:

1. You need to grant notification access permission to the app
2. Go to Settings > Apps > Special app access > Notification access
3. Find "Noti-Fin" in the list and enable it
4. You may need to restart the app after granting this permission

## License

This project is licensed under the MIT License.
