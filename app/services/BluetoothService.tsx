import { useState, useEffect, useRef } from "react";
import { Alert, Platform, Linking, NativeModules } from "react-native";
import Tts from "react-native-tts";

// Define interfaces for TTS
interface Voice {
  id?: string;
  name?: string;
  language?: string;
  quality?: number;
  isDefault?: boolean;
}

// Create a mock TTS implementation for when native TTS fails
const MockTts = {
  voices: () =>
    Promise.resolve([{ language: "vi-VN", name: "Vietnamese (Mock)" }]),
  getInitStatus: () => Promise.resolve("success"),
  setDefaultLanguage: () => Promise.resolve(),
  setDefaultRate: () => Promise.resolve(),
  setDefaultPitch: () => Promise.resolve(),
  addEventListener: () => {},
  removeEventListener: () => {},
  speak: (text: string) => {
    console.log(`[Mock TTS] Speaking: "${text}"`);
    return Promise.resolve();
  },
  stop: () => Promise.resolve(),
  isSpeaking: () => Promise.resolve(false),
};

// Use a reference to hold the active TTS implementation
let ActiveTts: typeof Tts | typeof MockTts = Tts;

// Detect if TTS is available and set up the appropriate implementation
try {
  if (
    typeof Tts === "undefined" ||
    Tts === null ||
    !NativeModules.TextToSpeech
  ) {
    console.log("Native TTS not available, using mock implementation");
    ActiveTts = MockTts;
  } else {
    console.log("Native TTS is available");
    ActiveTts = Tts;
  }
} catch (error) {
  console.error("Error during TTS detection:", error);
  ActiveTts = MockTts;
}

// Define device interface
export interface BluetoothDevice {
  name?: string;
  id: string;
  address?: string;
  connected?: boolean;
}

interface UseBluetoothReturn {
  devices: BluetoothDevice[];
  connectedDevice: BluetoothDevice | null;
  isEnabled: boolean;
  isScanning: boolean;
  isLoading: boolean;
  scanForDevices: () => Promise<void>;
  connectToDevice: (device: BluetoothDevice) => Promise<boolean>;
  disconnectDevice: () => Promise<void>;
  speak: (message: string) => Promise<void>;
  checkSystemConnection: () => Promise<void>;
  forceConnectToDevice: (deviceNameOrAddress: string) => Promise<boolean>;
  openBluetoothSettings: () => Promise<void>;
  setCustomVietnamesePhrase: (english: string, vietnamese: string) => void;
  getAvailableLanguages: () => Promise<string[]>;
}

// Mock data for testing
const MOCK_DEVICES: BluetoothDevice[] = [
  {
    name: "Generic Bluetooth Speaker",
    id: "00:11:22:33:44:55",
    address: "00:11:22:33:44:55",
    connected: false,
  },
  {
    name: "WYS-2301BT",
    id: "00:22:33:44:55:66",
    address: "00:22:33:44:55:66",
    connected: false,
  },
  {
    name: "Portable Speaker",
    id: "00:33:44:55:66:77",
    address: "00:33:44:55:66:77",
    connected: false,
  },
];

// Default Vietnamese phrases
const DEFAULT_VIETNAMESE_PHRASES = {
  hello: "Xin chào",
  "thank you": "Cảm ơn bạn",
  goodbye: "Tạm biệt",
  welcome: "Chào mừng",
  "how are you": "Bạn khỏe không",
  "good morning": "Chào buổi sáng",
  "good afternoon": "Chào buổi chiều",
  "good evening": "Chào buổi tối",
  please: "Làm ơn",
  sorry: "Xin lỗi",
  "what is your name": "Tên bạn là gì",
  "my name is": "Tên tôi là",
  "nice to meet you": "Rất vui được gặp bạn",
  "payment successful": "Thanh toán thành công",
  "payment received": "Đã nhận thanh toán",
};

// Helper function to safely speak text
const safeSpeak = async (text: string): Promise<void> => {
  try {
    // Use the active TTS implementation
    const result = ActiveTts.speak(text);
    if (result && typeof result === "object" && "then" in result) {
      await result;
    }
    return Promise.resolve();
  } catch (error) {
    console.error("Error in safeSpeak:", error);
    return Promise.reject(error);
  }
};

export default function useBluetoothService(): UseBluetoothReturn {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] =
    useState<BluetoothDevice | null>(null);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);

  // Reference to store Vietnamese phrases
  const vietnamesePhrases = useRef<Record<string, string>>({
    ...DEFAULT_VIETNAMESE_PHRASES,
  });

  // Initialize Bluetooth state and TTS
  useEffect(() => {
    console.log("Initializing simple Bluetooth service");
    setIsEnabled(true);
    setDevices(MOCK_DEVICES);

    // Initialize TTS
    initTts();

    return () => {
      // Clean up TTS
      try {
        ActiveTts.stop().catch(() => {});
      } catch (error) {
        console.log("Error stopping TTS during cleanup:", error);
      }
    };
  }, []);

  // Initialize TTS
  const initTts = async () => {
    try {
      console.log(
        "Initializing TTS with implementation:",
        ActiveTts === Tts ? "Native TTS" : "Mock TTS"
      );

      // Initialize TTS engine with better error handling
      try {
        await ActiveTts.getInitStatus().catch((err) => {
          console.log("TTS init status error, continuing anyway:", err);
          return null;
        });
      } catch (initErr) {
        console.log("Could not initialize TTS, continuing:", initErr);
      }

      // Set up event listeners with safe checks
      if (ActiveTts === Tts) {
        try {
          ActiveTts.addEventListener("tts-start", () => setIsSpeaking(true));
          ActiveTts.addEventListener("tts-finish", () => setIsSpeaking(false));
          ActiveTts.addEventListener("tts-cancel", () => setIsSpeaking(false));
          ActiveTts.addEventListener("tts-error", (err) => {
            console.error("TTS Error:", err);
            setIsSpeaking(false);
          });
        } catch (eventErr) {
          console.error("Could not set up TTS event listeners:", eventErr);
        }
      }

      // Try to get voices with better error handling
      let availableVoices: Voice[] = [];
      try {
        availableVoices = await new Promise<Voice[]>((resolve) => {
          // Use a timeout to handle cases where the call might hang
          const timeout = setTimeout(() => {
            console.log("Voice detection timed out");
            resolve([{ language: "vi-VN", name: "Vietnamese (Fallback)" }]);
          }, 3000);

          // Attempt to get voices
          ActiveTts.voices()
            .then((result: Voice[]) => {
              clearTimeout(timeout);
              resolve(result || []);
            })
            .catch((err: Error) => {
              console.log("Error getting voices, using fallback voice:", err);
              clearTimeout(timeout);
              resolve([{ language: "vi-VN", name: "Vietnamese (Fallback)" }]);
            });
        });
      } catch (voicesErr) {
        console.error("Failed to get TTS voices:", voicesErr);
        availableVoices = [
          { language: "vi-VN", name: "Vietnamese (Fallback)" },
        ];
      }

      console.log(
        "Available voices count:",
        Array.isArray(availableVoices) ? availableVoices.length : 0
      );

      // Try to set Vietnamese language with safeguards
      try {
        await ActiveTts.setDefaultLanguage("vi-VN").catch((err) => {
          console.log("Failed to set Vietnamese, trying fallback:", err);
        });
      } catch (langErr) {
        console.log("Setting Vietnamese language failed:", langErr);
      }

      // Set rate and pitch with error handling
      try {
        await ActiveTts.setDefaultRate(0.5).catch(() => null); // Slower speech rate
        await ActiveTts.setDefaultPitch(1.0).catch(() => null); // Normal pitch
      } catch (rateErr) {
        console.log("Failed to set speech rate/pitch:", rateErr);
      }

      console.log("TTS initialization completed");

      // Add the Vietnamese language to available languages
      setAvailableLanguages((prev) => {
        if (prev.includes("vi-VN")) return prev;
        return [...prev, "vi-VN"];
      });
    } catch (error) {
      console.error("TTS initialization failed with error:", error);
    }
  };

  // Open system Bluetooth settings
  const openBluetoothSettings = async (): Promise<void> => {
    try {
      if (Platform.OS === "android") {
        if (Platform.Version >= 31) {
          await Linking.sendIntent("android.settings.BLUETOOTH_SETTINGS");
        } else {
          await Linking.openSettings();
        }
      } else if (Platform.OS === "ios") {
        await Linking.openURL("App-Prefs:Bluetooth");
      }
      Alert.alert(
        "System Bluetooth Settings",
        "Please pair your Bluetooth speaker in the system settings, then return to the app."
      );
    } catch (error) {
      console.error("Could not open Bluetooth settings", error);
      Alert.alert(
        "Error Opening Settings",
        "Could not open Bluetooth settings. Please open them manually."
      );
    }
  };

  // Scan for devices
  const scanForDevices = async (): Promise<void> => {
    try {
      setIsScanning(true);

      // Simulate scanning delay and potential device discovery
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate a more dynamic list of devices to simulate real world scenarios
      const randomDevices: BluetoothDevice[] = [];

      // Add basic mock devices that are always present
      randomDevices.push(...MOCK_DEVICES);

      // Sometimes "discover" additional random devices
      if (Math.random() > 0.5) {
        const additionalDevices = [
          {
            name: "JBL Flip",
            id: generateRandomId(),
            address: generateRandomId(),
            connected: false,
          },
          {
            name: "Bose SoundLink",
            id: generateRandomId(),
            address: generateRandomId(),
            connected: false,
          },
          {
            name: "Sony SRS-XB12",
            id: generateRandomId(),
            address: generateRandomId(),
            connected: false,
          },
          {
            name: "Anker Soundcore",
            id: generateRandomId(),
            address: generateRandomId(),
            connected: false,
          },
        ];

        // Add 1-3 random additional devices
        const numToAdd = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numToAdd; i++) {
          if (additionalDevices[i]) {
            randomDevices.push(additionalDevices[i]);
          }
        }
      }

      // Update the device list
      setDevices(randomDevices);

      console.log(`Found ${randomDevices.length} Bluetooth devices`);
    } catch (error) {
      console.error("Error scanning for devices:", error);
      // Even on error, update with basic devices to ensure app can continue
      setDevices(MOCK_DEVICES);
    } finally {
      setIsScanning(false);
    }
  };

  // Helper to generate random Bluetooth-like addresses
  const generateRandomId = (): string => {
    const hexChars = "0123456789ABCDEF";
    let result = "";
    for (let i = 0; i < 6; i++) {
      const section = Array(2)
        .fill(0)
        .map(() => hexChars.charAt(Math.floor(Math.random() * hexChars.length)))
        .join("");
      result += (i > 0 ? ":" : "") + section;
    }
    return result;
  };

  // Connect to a device
  const connectToDevice = async (device: BluetoothDevice): Promise<boolean> => {
    try {
      // Display connection message
      Alert.alert(
        "System Connection Required",
        `Please make sure your "${
          device.name || "Bluetooth speaker"
        }" is connected in your phone's Bluetooth settings, then tap OK.`,
        [
          {
            text: "Open Bluetooth Settings",
            onPress: () => openBluetoothSettings(),
          },
          {
            text: "OK",
            onPress: () => {
              // Update connection state
              setConnectedDevice({ ...device, connected: true });
              setDevices((prev) =>
                prev.map((d) =>
                  d.id === device.id ? { ...d, connected: true } : d
                )
              );
            },
          },
        ]
      );
      return true;
    } catch (error) {
      console.error("Error connecting to device:", error);
      return false;
    }
  };

  // Disconnect from device
  const disconnectDevice = async (): Promise<void> => {
    if (!connectedDevice) return;

    try {
      setConnectedDevice(null);
      setDevices((prev) => prev.map((d) => ({ ...d, connected: false })));
      Alert.alert(
        "Device Disconnected",
        "You've disconnected from the Bluetooth speaker. To completely disconnect, you may need to also disconnect in your phone's Bluetooth settings."
      );
    } catch (error) {
      console.error("Error disconnecting:", error);
    }
  };

  // Check system connection
  const checkSystemConnection = async (): Promise<void> => {
    Alert.alert(
      "Check Connection in Settings",
      "To check if your speaker is connected, please check your phone's Bluetooth settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Bluetooth Settings",
          onPress: () => openBluetoothSettings(),
        },
      ]
    );
  };

  // Force connect to a specific device by name or address
  const forceConnectToDevice = async (
    deviceNameOrAddress: string
  ): Promise<boolean> => {
    try {
      // First try to find the device in the current device list
      let deviceToConnect = devices.find(
        (device) =>
          (device.name &&
            device.name
              .toLowerCase()
              .includes(deviceNameOrAddress.toLowerCase())) ||
          device.id === deviceNameOrAddress ||
          device.address === deviceNameOrAddress
      );

      // If no device found, scan for devices and try again
      if (!deviceToConnect && deviceNameOrAddress) {
        await scanForDevices();

        // Look again after scanning
        deviceToConnect = devices.find(
          (device) =>
            (device.name &&
              device.name
                .toLowerCase()
                .includes(deviceNameOrAddress.toLowerCase())) ||
            device.id === deviceNameOrAddress ||
            device.address === deviceNameOrAddress
        );
      }

      // If we still don't have a match, ask user to select from available devices
      if (!deviceToConnect) {
        if (devices.length === 0) {
          Alert.alert(
            "No Devices Found",
            "No Bluetooth speakers were found. Please make sure your speaker is turned on and in pairing mode.",
            [
              {
                text: "Open Bluetooth Settings",
                onPress: () => openBluetoothSettings(),
              },
              { text: "OK" },
            ]
          );
          return false;
        }

        // Create a device with the requested name if nothing is found
        if (deviceNameOrAddress) {
          const newDevice = {
            name: deviceNameOrAddress,
            id: generateRandomId(),
            address: generateRandomId(),
            connected: false,
          };
          setDevices((prev) => [...prev, newDevice]);
          return await connectToDevice(newDevice);
        }
      }

      // Connect to the device if found
      if (deviceToConnect) {
        return await connectToDevice(deviceToConnect);
      }

      return false;
    } catch (error) {
      console.error("Error in force connect:", error);
      return false;
    }
  };

  // Function to get available TTS languages
  const getAvailableLanguages = async (): Promise<string[]> => {
    try {
      // If using mock TTS, return hardcoded languages
      if (ActiveTts === MockTts) {
        const mockLanguages = ["vi-VN", "en-US"];
        setAvailableLanguages(mockLanguages);
        return mockLanguages;
      }

      // Safely get voices
      let voices: Voice[] = [];
      try {
        voices = await new Promise<Voice[]>((resolve) => {
          // Use a timeout to handle cases where the call might hang
          const timeout = setTimeout(() => {
            console.log("Voice detection timed out");
            resolve([{ language: "vi-VN", name: "Vietnamese (Fallback)" }]);
          }, 3000);

          // Attempt to get voices
          ActiveTts.voices()
            .then((result: Voice[]) => {
              clearTimeout(timeout);
              resolve(result || []);
            })
            .catch((err) => {
              console.error("Error getting voices:", err);
              clearTimeout(timeout);
              resolve([{ language: "vi-VN", name: "Vietnamese (Fallback)" }]);
            });
        });
      } catch (error) {
        console.error("Error in voice detection:", error);
        voices = [{ language: "vi-VN", name: "Vietnamese (Fallback)" }];
      }

      // Extract unique languages
      const languages = voices
        .filter((voice) => voice && voice.language)
        .map((voice) => voice.language as string)
        .filter(Boolean);

      // Get unique languages
      let uniqueLanguages = [...new Set(languages)];

      // Ensure Vietnamese is always available
      if (!uniqueLanguages.includes("vi-VN")) {
        uniqueLanguages.push("vi-VN");
      }

      console.log(`Found ${uniqueLanguages.length} available languages`);
      setAvailableLanguages(uniqueLanguages);
      return uniqueLanguages;
    } catch (error) {
      console.error("Error getting languages:", error);
      const fallback = ["vi-VN", "en-US"];
      setAvailableLanguages(fallback);
      return fallback;
    }
  };

  // Add custom Vietnamese phrase
  const setCustomVietnamesePhrase = (
    english: string,
    vietnamese: string
  ): void => {
    if (!english || !vietnamese) {
      Alert.alert(
        "Input Error",
        "Both English and Vietnamese phrases are required"
      );
      return;
    }

    vietnamesePhrases.current = {
      ...vietnamesePhrases.current,
      [english.toLowerCase()]: vietnamese,
    };

    Alert.alert(
      "Phrase Added",
      `Added translation: "${english}" → "${vietnamese}"`
    );

    console.log(`Added phrase: "${english}" → "${vietnamese}"`);
  };

  // Speak through the device with better error handling
  const speak = async (message: string): Promise<void> => {
    if (!connectedDevice) {
      Alert.alert(
        "No Device Connected",
        "Please connect to a Bluetooth speaker first."
      );
      return;
    }

    try {
      // Check if we're already speaking and stop safely
      if (isSpeaking) {
        try {
          await ActiveTts.stop().catch(() => {});
        } catch (stopErr) {
          console.log("Failed to stop current speech:", stopErr);
        }
      }

      // Convert message to Vietnamese if needed
      let textToSpeak = message;

      // Check if the message is one of our pre-defined phrases
      try {
        const lowerMsg = message.toLowerCase();
        for (const [english, vietnamese] of Object.entries(
          vietnamesePhrases.current
        )) {
          if (lowerMsg.includes(english)) {
            textToSpeak = vietnamese;
            console.log(`Translated "${english}" to "${vietnamese}"`);
            break;
          }
        }
      } catch (translateErr) {
        console.log("Error in translation, using original text:", translateErr);
      }

      // Try to speak the message with proper error handling
      console.log(`Speaking message in Vietnamese: "${textToSpeak}"`);
      setIsSpeaking(true);

      try {
        await safeSpeak(textToSpeak);
        // Wait a moment before allowing more speech
        setTimeout(() => {
          setIsSpeaking(false);
        }, 1000);
      } catch (err) {
        console.error("TTS speak error:", err);
        setIsSpeaking(false);
        Alert.alert(
          "TTS Error",
          "There was an error trying to speak the message. Please make sure TTS is enabled on your device."
        );
      }
    } catch (error) {
      console.error("TTS Error:", error);
      setIsSpeaking(false);
      Alert.alert(
        "TTS Error",
        "There was an error trying to speak the message. Please make sure TTS is enabled on your device."
      );
    }
  };

  return {
    devices,
    connectedDevice,
    isEnabled,
    isScanning,
    isLoading: isScanning || isSpeaking,
    scanForDevices,
    connectToDevice,
    disconnectDevice,
    speak,
    checkSystemConnection,
    forceConnectToDevice,
    openBluetoothSettings,
    setCustomVietnamesePhrase,
    getAvailableLanguages,
  };
}
