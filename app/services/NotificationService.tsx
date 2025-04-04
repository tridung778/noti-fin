import { useEffect, useState, useCallback } from "react";
import {
  Platform,
  Alert,
  AppState,
  AppStateStatus,
  Linking,
  PermissionsAndroid,
} from "react-native";
import useBluetoothService from "./BluetoothService";

interface NotificationServiceProps {
  onPaymentReceived: (amount: string, sender: string) => void;
}

// This hook provides notification handling for payment detection
export default function useNotificationService({
  onPaymentReceived,
}: NotificationServiceProps) {
  const [hasPermission, setHasPermission] = useState(false);
  const { speak, isSimulationMode } = useBluetoothService();
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState
  );
  const [demoMode, setDemoMode] = useState(true);

  // Request notification permissions - on Android we need to guide the user
  // to enable the notification listener service manually
  const requestPermissions = async () => {
    console.log("Requesting notification permissions");

    if (Platform.OS === "android") {
      try {
        // For Android 13+ (API 33+), we need to request POST_NOTIFICATIONS
        if (Number(Platform.Version) >= 33) {
          const notificationPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );

          if (notificationPermission !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              "Notification Permission Required",
              "This app needs permission to show notifications. Please grant this permission in Settings.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Open Settings",
                  onPress: () => Linking.openSettings(),
                },
              ]
            );
            return false;
          }
        }

        // We'll use demo mode if we're in simulation mode
        if (isSimulationMode) {
          setDemoMode(true);
          setHasPermission(true);

          Alert.alert(
            "Simulation Mode Active",
            "Running in demo mode. Use the 'Demo Payment' button to simulate payment notifications.",
            [{ text: "OK" }]
          );
          return true;
        }

        // For notification listening, we need to direct users to the system settings
        // as this can't be requested programmatically
        Alert.alert(
          "Notification Access Required",
          "To detect MoMo payment notifications, this app needs access to your device's notifications. Please enable notification access in your device settings.",
          [
            {
              text: "Use Demo Mode",
              style: "cancel",
              onPress: () => {
                setDemoMode(true);
                setHasPermission(true);
                return true;
              },
            },
            {
              text: "Open Settings",
              onPress: () => {
                try {
                  // This URI might vary between different Android versions/manufacturers
                  Linking.openSettings();

                  // We can't programmatically check if the user granted access,
                  // but we'll assume they did for demonstration purposes
                  setHasPermission(true);
                  setDemoMode(false);
                  return true;
                } catch (error) {
                  console.error("Failed to open settings:", error);
                  setDemoMode(true);
                  setHasPermission(true);
                  return false;
                }
              },
            },
          ]
        );

        // We're optimistically assuming the user will grant permission
        setHasPermission(true);
        return true;
      } catch (error) {
        console.error("Error requesting permissions:", error);
        setDemoMode(true);
        setHasPermission(true);
        return true;
      }
    } else {
      // iOS doesn't allow notification access in the same way
      Alert.alert(
        "iOS Limitation",
        "Due to iOS restrictions, this app cannot access notifications from other apps. The demo mode will be used instead."
      );

      // For iOS, we'll fall back to demo mode
      setDemoMode(true);
      setHasPermission(true);
      return true;
    }
  };

  // For demo purposes or when real implementation not available
  const simulatePaymentNotification = useCallback(() => {
    // Create a realistic demo payment
    const amounts = ["50,000", "100,000", "25,000", "200,000", "75,000"];
    const senders = [
      "Demo User",
      "Test Account",
      "John Doe",
      "Jane Smith",
      "MoMo Test",
    ];

    const amount = amounts[Math.floor(Math.random() * amounts.length)];
    const sender = senders[Math.floor(Math.random() * senders.length)];

    // Announce the payment through the Bluetooth speaker
    const message = `You have received ${amount} VND from ${sender}`;
    console.log(`Payment received: ${amount} VND from ${sender}`);

    // Speak the message and then trigger the callback
    speak(message)
      .then(() => {
        onPaymentReceived(amount, sender);
      })
      .catch((error) => {
        console.error("Error speaking notification:", error);
        onPaymentReceived(amount, sender);
      });
  }, [speak, onPaymentReceived]);

  // Process notifications that might be payment notifications
  const processNotification = useCallback(
    (notification: any) => {
      try {
        // In a real implementation, this would extract data from the actual notification
        // to determine if it's a MoMo payment notification
        const isMoMoNotification =
          notification?.packageName === "com.mservice.momotransfer" || // Real MoMo package name
          notification?.title?.includes("MoMo") ||
          notification?.text?.includes("MoMo");

        const isPaymentNotification =
          notification?.text?.toLowerCase().includes("received") ||
          notification?.text?.toLowerCase().includes("transfer") ||
          notification?.text?.toLowerCase().includes("payment");

        if (isMoMoNotification && isPaymentNotification) {
          // Extract payment information from notification text
          const extractAmount = (text: string) => {
            const amountMatch = text.match(/(\d{1,3}(,\d{3})*(\.\d+)?) ?VND/i);
            return amountMatch ? amountMatch[1] : "unknown amount";
          };

          const extractSender = (text: string) => {
            const senderMatch = text.match(/from ([^\s]+)/i);
            return senderMatch ? senderMatch[1] : "unknown sender";
          };

          const amount = extractAmount(notification.text);
          const sender = extractSender(notification.text);

          // Announce the payment
          const message = `You have received ${amount} VND from ${sender}`;
          speak(message)
            .then(() => {
              onPaymentReceived(amount, sender);
            })
            .catch((error) => {
              console.error("Error speaking notification:", error);
              onPaymentReceived(amount, sender);
            });
        }
      } catch (error) {
        console.error("Error processing notification:", error);
      }
    },
    [speak, onPaymentReceived]
  );

  // When the app comes back to foreground, check for missed notifications
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.match(/inactive|background/) && nextAppState === "active") {
      console.log("App is now active, checking for missed notifications");

      if (hasPermission && demoMode) {
        // For demo purposes, occasionally simulate a missed notification
        if (Math.random() > 0.7) {
          setTimeout(() => simulatePaymentNotification(), 1500);
        }
      } else if (hasPermission && !demoMode) {
        // In a real implementation with a native module, you'd check for missed notifications here
        console.log(
          "Would check for missed notifications in real implementation"
        );
      }
    }
    setAppState(nextAppState);
  };

  useEffect(() => {
    // Set up AppState listener for detecting app foregrounding
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // For real notification listening, you'd set up a native module listener here
    if (
      Platform.OS === "android" &&
      hasPermission &&
      !demoMode &&
      !isSimulationMode
    ) {
      console.log("Would set up notification listener in real implementation");
    }

    return () => {
      subscription.remove();
    };
  }, [
    appState,
    hasPermission,
    processNotification,
    demoMode,
    isSimulationMode,
  ]);

  return {
    hasPermission,
    requestPermissions,
    simulatePaymentNotification,
    isDemoMode: demoMode,
  };
}
