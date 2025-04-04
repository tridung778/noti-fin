import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  Keyboard,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import useBluetoothService, {
  BluetoothDevice,
} from "./services/BluetoothService";

const PaymentListenerScreen = () => {
  const {
    devices,
    connectedDevice,
    isEnabled,
    isScanning,
    isLoading,
    scanForDevices,
    connectToDevice,
    disconnectDevice,
    speak,
    checkSystemConnection,
    forceConnectToDevice,
    openBluetoothSettings,
    setCustomVietnamesePhrase,
    getAvailableLanguages,
  } = useBluetoothService();

  const [message, setMessage] = useState<string>(
    "Your payment has been processed successfully"
  );
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [englishPhrase, setEnglishPhrase] = useState<string>("");
  const [vietnamesePhrase, setVietnamesePhrase] = useState<string>("");
  const [languages, setLanguages] = useState<string[]>([]);

  // Helper function to get consistent device ID
  const getDeviceId = (device: BluetoothDevice): string => {
    return device.id || device.address || "unknown";
  };

  // Try to connect to WYS speaker on startup and check available languages
  useEffect(() => {
    const initialize = async () => {
      // Get available languages
      const langs = await getAvailableLanguages();
      setLanguages(langs);
    };

    initialize();
  }, [devices]);

  const handleScan = async () => {
    await scanForDevices();
  };

  const handleConnect = async (device: BluetoothDevice) => {
    try {
      setIsConnecting(true);
      await connectToDevice(device);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectDevice();
  };

  const handleSpeak = async () => {
    if (!message.trim()) {
      Alert.alert("Empty Message", "Please enter a message to speak");
      return;
    }

    Keyboard.dismiss();
    await speak(message);
  };

  const handleRefreshConnection = async () => {
    await checkSystemConnection();
  };

  const handleConnectByButton = async () => {
    try {
      // Show a dialog to let the user select which speaker to connect to
      if (devices.length === 0) {
        Alert.alert(
          "No Devices Found",
          "Please scan for devices first or make sure your Bluetooth speaker is turned on and in pairing mode.",
          [
            {
              text: "Scan for Devices",
              onPress: () => scanForDevices(),
            },
            {
              text: "Open Bluetooth Settings",
              onPress: () => openBluetoothSettings(),
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return;
      }

      // If there's just one device, connect to it directly
      if (devices.length === 1) {
        setIsConnecting(true);
        await connectToDevice(devices[0]);
        setIsConnecting(false);
        return;
      }

      // Otherwise, show a list of available devices
      Alert.alert(
        "Select a Speaker",
        "Please select a Bluetooth speaker to connect to:",
        [
          ...devices.map((device) => ({
            text: device.name || `Device (${device.address || device.id})`,
            onPress: async () => {
              setIsConnecting(true);
              await connectToDevice(device);
              setIsConnecting(false);
            },
          })),
          { text: "Cancel", style: "cancel" },
        ]
      );
    } catch (error) {
      console.error("Error connecting to Bluetooth device:", error);
      Alert.alert(
        "Connection Failed",
        "Could not connect to the speaker. Please make sure it's turned on and paired in your system settings.",
        [
          {
            text: "Open Bluetooth Settings",
            onPress: () => openBluetoothSettings(),
          },
          { text: "OK" },
        ]
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const openSettings = () => {
    Alert.alert("Settings", "Settings page would open here in a real app");
  };

  const handleAddPhrase = () => {
    if (!englishPhrase.trim() || !vietnamesePhrase.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter both English and Vietnamese phrases"
      );
      return;
    }

    setCustomVietnamesePhrase(englishPhrase, vietnamesePhrase);
    setEnglishPhrase("");
    setVietnamesePhrase("");
    Keyboard.dismiss();
  };

  const handleDefaultPhraseSpeak = (english: string, vietnamese: string) => {
    if (!connectedDevice) {
      Alert.alert(
        "No Device Connected",
        "Please connect to a Bluetooth speaker first."
      );
      return;
    }

    speak(vietnamese);
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar style="auto" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Bluetooth Speaker</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={openSettings}
          >
            <Text style={styles.settingsButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Connection Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Bluetooth: {isEnabled ? "Enabled" : "Disabled"}
          </Text>
          <Text style={styles.statusText}>
            Connected:{" "}
            {connectedDevice ? connectedDevice.name || "Device" : "No Device"}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Scan For Devices</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleConnectByButton}
            disabled={Boolean(isConnecting) || Boolean(connectedDevice)}
          >
            {isConnecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Connect to Speaker</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              !connectedDevice && styles.disabledButton,
            ]}
            onPress={handleDisconnect}
            disabled={!connectedDevice}
          >
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRefreshConnection}
          >
            <Text style={styles.buttonText}>Refresh Connection</Text>
          </TouchableOpacity>
        </View>

        {/* Device List */}
        <View style={styles.deviceList}>
          <Text style={styles.sectionTitle}>Available Devices:</Text>
          {devices.length === 0 ? (
            <Text style={styles.emptyText}>No devices found</Text>
          ) : (
            <FlatList
              data={devices}
              keyExtractor={(item) => getDeviceId(item)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.deviceItem,
                    connectedDevice &&
                      getDeviceId(connectedDevice) === getDeviceId(item) &&
                      styles.connectedDevice,
                  ]}
                  onPress={() => handleConnect(item)}
                  disabled={
                    Boolean(isConnecting) ||
                    Boolean(
                      connectedDevice &&
                        getDeviceId(connectedDevice) === getDeviceId(item)
                    )
                  }
                >
                  <Text style={styles.deviceName}>
                    {item.name || "Unknown Device"}
                  </Text>
                  <Text style={styles.deviceAddress}>
                    {item.address || item.id}
                  </Text>
                  {connectedDevice &&
                    getDeviceId(connectedDevice) === getDeviceId(item) && (
                      <Text style={styles.connectedText}>Connected</Text>
                    )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        {/* Test Speaker Section */}
        <View style={styles.speakContainer}>
          <Text style={styles.sectionTitle}>Test Speaker</Text>
          <TextInput
            style={styles.textInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Enter message to speak"
            multiline
          />
          <TouchableOpacity
            style={[
              styles.speakButton,
              !connectedDevice && styles.disabledButton,
            ]}
            onPress={handleSpeak}
            disabled={!connectedDevice || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Speak Message</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Vietnamese Translation Section */}
        <View style={styles.speakContainer}>
          <Text style={styles.sectionTitle}>Vietnamese Translation</Text>

          {/* Available Languages */}
          <View style={styles.languageContainer}>
            <Text style={styles.subTitle}>Available Languages:</Text>
            <Text style={styles.languageText}>
              {languages.length > 0
                ? languages.join(", ")
                : "No languages detected. Make sure TTS is enabled on your device."}
            </Text>
          </View>

          {/* Add Custom Phrase */}
          <View style={styles.translationContainer}>
            <Text style={styles.subTitle}>Add Custom Translation:</Text>
            <TextInput
              style={styles.textInput}
              value={englishPhrase}
              onChangeText={setEnglishPhrase}
              placeholder="English phrase"
            />
            <TextInput
              style={styles.textInput}
              value={vietnamesePhrase}
              onChangeText={setVietnamesePhrase}
              placeholder="Vietnamese translation"
            />
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAddPhrase}
            >
              <Text style={styles.buttonText}>Add Translation</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Phrases */}
          <View style={styles.quickPhrasesContainer}>
            <Text style={styles.subTitle}>Quick Vietnamese Phrases:</Text>
            <View style={styles.phrasesGrid}>
              <TouchableOpacity
                style={styles.phraseButton}
                onPress={() => handleDefaultPhraseSpeak("hello", "Xin chào")}
                disabled={Boolean(isLoading) || !Boolean(connectedDevice)}
              >
                <Text style={styles.phraseText}>Hello</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.phraseButton}
                onPress={() =>
                  handleDefaultPhraseSpeak("thank you", "Cảm ơn bạn")
                }
                disabled={Boolean(isLoading) || !Boolean(connectedDevice)}
              >
                <Text style={styles.phraseText}>Thank you</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.phraseButton}
                onPress={() =>
                  handleDefaultPhraseSpeak(
                    "payment successful",
                    "Thanh toán thành công"
                  )
                }
                disabled={Boolean(isLoading) || !Boolean(connectedDevice)}
              >
                <Text style={styles.phraseText}>Payment Successful</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.phraseButton}
                onPress={() => handleDefaultPhraseSpeak("goodbye", "Tạm biệt")}
                disabled={Boolean(isLoading) || !Boolean(connectedDevice)}
              >
                <Text style={styles.phraseText}>Goodbye</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  headerText: {
    fontSize: 22,
    fontWeight: "bold",
  },
  settingsButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: "#2196F3",
    borderRadius: 5,
  },
  settingsButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  statusContainer: {
    margin: 15,
    padding: 15,
    backgroundColor: "white",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 5,
  },
  actionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 15,
  },
  actionButton: {
    width: "48%",
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: "#B0BEC5",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  deviceList: {
    flex: 2,
    margin: 15,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: "#757575",
  },
  deviceItem: {
    backgroundColor: "#E3F2FD",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  connectedDevice: {
    backgroundColor: "#C8E6C9",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  deviceAddress: {
    fontSize: 14,
    color: "#616161",
  },
  connectedText: {
    color: "#2E7D32",
    fontWeight: "bold",
    marginTop: 5,
  },
  speakContainer: {
    flex: 1,
    margin: 15,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    height: 80,
    textAlignVertical: "top",
    marginBottom: 10,
  },
  speakButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  languageContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  translationContainer: {
    marginBottom: 15,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  languageText: {
    fontSize: 14,
    color: "#444",
  },
  quickPhrasesContainer: {
    marginTop: 10,
  },
  phrasesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  phraseButton: {
    width: "48%",
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  phraseText: {
    color: "white",
    fontWeight: "500",
  },
});

export default PaymentListenerScreen;
