# Services Directory

This directory contains service implementations for the Noti-Fin application:

## BluetoothService.tsx

A React hook that provides Bluetooth functionality:

- Scanning for available Bluetooth devices
- Connecting to a selected device
- Managing the connection state
- Text-to-speech functionality for payment announcements

## NotificationService.tsx

A React hook that provides notification handling functionality:

- Listens for incoming notifications
- Filters for MoMo payment notifications
- Extracts payment information (amount, sender)
- Triggers the text-to-speech announcements

## Implementation Notes

### Permissions

The app requires the following permissions:

- Bluetooth permissions (for connecting to speakers)
- Notification listener access (requires manual setup in Android settings)

### Android Implementation

This service relies on the following native modules:

- `@notifee/react-native` - For notification handling
- `react-native-tts` - For text-to-speech
- `react-native-bluetooth-classic` - For Bluetooth connectivity

### Testing

You can test the functionality without receiving an actual MoMo payment by:

1. Using the "Test Speaker" button in the app
2. Sending a test notification with a similar format to MoMo payment notifications
