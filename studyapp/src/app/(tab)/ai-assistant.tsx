import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";
import { confirmAction } from "../../firebase/auth";
import MarkdownView from "../../components/MarkdownView";
import { getApiUrl } from "../../api";
import { askCampuslyAI } from "../../services/aiService";
import { useAppTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import {
  classifyImageWithMobileNet,
  formatMobileNetStudyExplanation,
  MobileNetResult,
  VisionDomain,
} from "../../services/mobileNetVision";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const API_URL = getApiUrl();

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  time?: string;
  imageUri?: string;
  visionTag?: string;
  confidence?: number;
  mobileNetResult?: MobileNetResult;
};

type QuickAction = {
  id: string;
  titleKey: string;
  title: string;
  subtitleKey: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  prompt: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "explain",
    titleKey: "explainTopic",
    title: "Explain a topic",
    subtitleKey: "explainTopicSub",
    subtitle: "Get simple explanations",
    icon: "book",
    iconBg: "#EDE9FE",
    iconColor: "#7C3AED",
    prompt: "Can you explain a difficult topic in simple terms with examples?",
  },
  {
    id: "plan",
    titleKey: "createStudyPlan",
    title: "Create study plan",
    subtitleKey: "createStudyPlanSub",
    subtitle: "Plan your study schedule",
    icon: "calendar",
    iconBg: "#E0F2FE",
    iconColor: "#0284C7",
    prompt: "Help me create an effective study schedule for my upcoming exams.",
  },
  {
    id: "solve",
    titleKey: "solveQuestion",
    title: "Solve a question",
    subtitleKey: "solveQuestionSub",
    subtitle: "Get step-by-step solutions",
    icon: "help-circle",
    iconBg: "#DCFCE7",
    iconColor: "#16A34A",
    prompt: "Can you help me solve this question step by step?",
  },
  {
    id: "summarize",
    titleKey: "summarizeNotes",
    title: "Summarize notes",
    subtitleKey: "summarizeNotesSub",
    subtitle: "Turn long notes into key points",
    icon: "document-text",
    iconBg: "#FFEDD5",
    iconColor: "#EA580C",
    prompt: "Summarize my lecture notes into quick revision key points.",
  },
  {
    id: "exam",
    titleKey: "examPrep",
    title: "Exam preparation",
    subtitleKey: "examPrepSub",
    subtitle: "Get tips & resources for exams",
    icon: "school",
    iconBg: "#EDE9FE",
    iconColor: "#6366F1",
    prompt: "Give me the most important exam preparation tips and high-yield topics.",
  },
  {
    id: "college",
    titleKey: "collegeInfo",
    title: "College information",
    subtitleKey: "collegeInfoSub",
    subtitle: "Know about campus, facilities & more",
    icon: "business",
    iconBg: "#E0F2FE",
    iconColor: "#0284C7",
    prompt: "Tell me about the campus facilities, timings, and college services.",
  },
];

// Initial default sample conversation matching reference image
const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: "sample-user-1",
    role: "user",
    text: "What is the difference between DBMS and DSA?",
    time: "10:24 AM",
  },
  {
    id: "sample-ai-1",
    role: "assistant",
    text: `Great question! Here's a clear comparison between DBMS and DSA:

| Feature | DBMS (Database Management System) | DSA (Data Structures & Algorithms) |
| :--- | :--- | :--- |
| **Primary Focus** | Storing, querying, and managing persistent data safely. | Efficient ways to organize and process in-memory data. |
| **Examples** | MySQL, PostgreSQL, MongoDB, Oracle. | Arrays, Linked Lists, Trees, Graphs, Sorting, Searching. |
| **Applications** | Real-world applications like websites, banking apps, CRM systems. | Core problem-solving, building efficient algorithms & logic. |

In short: **DBMS manages data**, while **DSA helps you work with data efficiently!** 💡`,
    time: "10:24 AM",
  },
];

// Intelligent student knowledge base generator
function generateIntelligentStudentResponse(prompt: string, studentName: string): string {
  const lower = prompt.toLowerCase();

  // BODMAS / Mathematical Evaluation Rule
  if (
    lower.includes("bodmas") ||
    lower.includes("pemdas") ||
    /(\d+)\s*[\+\-\*\/]\s*(\d+)/.test(prompt)
  ) {
    return `### 📐 BODMAS / PEMDAS Order of Operations

In mathematics, calculations strictly follow the **BODMAS / PEMDAS** rule:
1. **B / P**: **B**rackets / **P**arentheses first $(...)$
2. **O / E**: **O**rders / **E**xponents ($x^2, \\sqrt{x}$)
3. **D / M**: **D**ivision and **M**ultiplication (evaluated from **left to right**)
4. **A / S**: **A**ddition and **S**ubtraction (evaluated from **left to right**)

#### 💡 Step-by-Step Example:
For $2 + 3 \\times 4$:
1. **Multiplication first**: $3 \\times 4 = 12$
2. **Addition second**: $2 + 12 = 14$
- **Final Result**: **14**

Always remember that multiplication does **not** always precede division; whichever appears first from left to right takes priority! The same applies to addition and subtraction. 🎯`;
  }

  // Name query handling
  if (
    lower.includes("say my name") ||
    lower.includes("what is my name") ||
    lower.includes("know my name")
  ) {
    return `You are **${studentName}**! Nice to interact with you. How can I assist you with your academics or campus schedule today?`;
  }

  if (lower.includes("dbms") && lower.includes("dsa")) {
    return `Great question, ${studentName}! Here's a clear comparison between DBMS and DSA:

| Feature | DBMS (Database Management System) | DSA (Data Structures & Algorithms) |
| :--- | :--- | :--- |
| **Primary Focus** | Storing, querying, and managing persistent data safely. | Efficient ways to organize and process in-memory data. |
| **Examples** | MySQL, PostgreSQL, MongoDB, Oracle. | Arrays, Linked Lists, Trees, Graphs, Sorting, Searching. |
| **Applications** | Real-world applications like websites, banking apps, CRM systems. | Core problem-solving, building efficient algorithms & logic. |

In short: **DBMS manages data**, while **DSA helps you work with data efficiently!** 💡`;
  }

  if (lower.includes("plan") || lower.includes("schedule") || lower.includes("time table")) {
    return `Here is a structured, high-efficiency study plan tailored for your college coursework, ${studentName}:

### 📅 Weekly High-Yield Study Routine
1. **Morning Focus (8:00 AM – 10:00 AM)**:
   - Deep conceptual learning (Core engineering subjects like OS, DBMS, or Networks).
   - 50 min study + 10 min break.
2. **Afternoon Practical (2:00 PM – 4:00 PM)**:
   - Coding practice, DSA problems, or lab assignments.
   - Solve 2 LeetCode/HackerRank problems or write code.
3. **Evening Review (7:00 PM – 9:00 PM)**:
   - Revision of today's lecture notes and upcoming assignment preparation.
4. **Night Wrap-up (10:00 PM – 10:30 PM)**:
   - 30-minute flashcards & schedule review on Campusly.

💡 **Key Tip**: Consistent 3 hours of daily focused study yields far better results than cramming before exams!`;
  }

  if (lower.includes("exam") || lower.includes("preparation") || lower.includes("tips")) {
    return `Here are the top exam preparation strategies for top academic performance:

1. **Focus on High-Weightage Units First**:
   - Analyze previous 3 years' question papers (PYQs).
   - Identify recurring 10-mark and 16-mark questions.
2. **Active Recall over Passive Reading**:
   - Close the book and write down key definitions, architectures, and diagrams.
3. **Formula & Diagram Sheet**:
   - Create a single-page cheatsheet with all critical theorems and formulas.
4. **Time Management During Exams**:
   - Spend first 5 minutes skimming questions.
   - Allocate minutes based on marks: ~1.5 minutes per mark.

Good luck, ${studentName}! You've got this! 🎯`;
  }

  if (lower.includes("summarize") || lower.includes("notes")) {
    return `### 📝 Lecture Notes Revision Summary

- **Core Principle**: Grasp the primary objective before diving into edge cases.
- **Key Formulas / Equations**: Review governing equations and boundary conditions.
- **Critical Diagrams**: Practice block diagrams and flowcharts for full marks.
- **Common Mistakes to Avoid**: Always mention assumptions and SI units in calculations.

*Pro-Tip*: Paste any specific text or topic here anytime, and I'll generate bulleted study flashcards instantly!`;
  }

  if (lower.includes("college") || lower.includes("campus") || lower.includes("facilities")) {
    return `Here are the essential Campusly services available for you, ${studentName}:

- 🏢 **Hostel & Amenities**: 24/7 Wi-Fi, study hall access, and maintenance portal.
- 🍽️ **Mess Services**: Breakfast (7:30 - 9:00 AM), Lunch (12:30 - 2:00 PM), Snacks & Dinner. Check the live menu in the Mess tab!
- 📚 **Central Library**: Open 8:00 AM to 10:00 PM. Digital catalog and reserved study pods.
- 🎯 **Academic Gatepass & Leave**: Submit requests digitally under the Request module.`;
  }

  if (lower.includes("binary search tree") || lower.includes("bst")) {
    return `### 🌲 Binary Search Tree (BST) Explained

A Binary Search Tree is a node-based binary tree data structure with the following properties:
- The **left subtree** of a node contains only nodes with keys **less than** the node's key.
- The **right subtree** of a node contains only nodes with keys **greater than** the node's key.
- Both left and right subtrees must also be binary search trees.

#### ⏱️ Time Complexity:
| Operation | Average Case | Worst Case (Skewed Tree) |
| :--- | :--- | :--- |
| **Search** | $O(\\log n)$ | $O(n)$ |
| **Insertion** | $O(\\log n)$ | $O(n)$ |
| **Deletion** | $O(\\log n)$ | $O(n)$ |

💡 **Self-Balancing Tip**: To prevent the worst-case $O(n)$, use self-balancing BSTs like **AVL Trees** or **Red-Black Trees**!`;
  }

  // General helpful response
  return `That's an important topic, ${studentName}!

Here is a clear breakdown for you:
- **Concept Overview**: Understand the core objective and why this concept is used in real-world systems.
- **Key Takeaways**:
  1. Always start by identifying the inputs, constraints, and desired output.
  2. Break complex problems into smaller, manageable sub-problems.
  3. Verify with sample test cases and boundary conditions.

Feel free to ask follow-up questions, request code examples, or ask me to test your understanding! 🚀`;
}

// Stylized cute robot avatar matching the screenshot
export function RobotAvatar({ size = 36, showSparkle = false }: { size?: number; showSparkle?: boolean }) {
  const headW = size * 0.76;
  const headH = size * 0.62;
  const visorW = headW * 0.74;
  const visorH = headH * 0.6;

  return (
    <View style={[styles.robotWrapper, { width: size, height: size }]}>
      <View
        style={[
          styles.robotCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: "#EEF2FF",
            borderColor: "#C7D2FE",
          },
        ]}
      >
        {/* Top Antenna */}
        <View style={styles.antennaStem} />
        <View style={styles.antennaBall} />

        {/* Headphone Ears */}
        <View style={[styles.earPill, { left: 1 }]} />
        <View style={[styles.earPill, { right: 1 }]} />

        {/* Robot Head */}
        <View
          style={[
            styles.robotHead,
            {
              width: headW,
              height: headH,
              borderRadius: headH / 2,
            },
          ]}
        >
          {/* Dark Visor */}
          <View
            style={[
              styles.robotVisor,
              {
                width: visorW,
                height: visorH,
                borderRadius: visorH / 2,
              },
            ]}
          >
            {/* Glowing smiling curved eyes */}
            <View style={styles.robotEye} />
            <View style={styles.robotEye} />
          </View>
        </View>
      </View>

      {/* Star Sparkle on top right */}
      {showSparkle && (
        <View style={styles.sparkleBadge}>
          <Ionicons name="sparkles" size={10} color="#8B5CF6" />
        </View>
      )}
    </View>
  );
}

export default function AIAssistantScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("Tuffan");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(SAMPLE_MESSAGES);
  const [listeningVoice, setListeningVoice] = useState(false);

  // MobileNet Visual AI state
  const [selectedImage, setSelectedImage] = useState<{
    uri: string;
    base64?: string;
    width?: number;
    height?: number;
  } | null>(null);
  const [activeScanResult, setActiveScanResult] = useState<MobileNetResult | null>(null);
  const [isAnalyzingVisual, setIsAnalyzingVisual] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerDomain, setScannerDomain] = useState<VisionDomain>("all");
  const [fullScreenImageUri, setFullScreenImageUri] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  // Load authenticated user profile info and real-time AI conversation history
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserName("Student");
        setChatMessages(SAMPLE_MESSAGES);
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserName(data.fullName || data.name || user.displayName || "Student");
        } else {
          setUserName(user.displayName || "Student");
        }
      } catch (e) {
        setUserName(user.displayName || "Student");
      }

      // Real-time Firestore chat history subscription
      try {
        const chatsRef = collection(db, "users", user.uid, "aiChats");
        const chatsQuery = query(chatsRef, orderBy("createdAt", "asc"));

        unsubscribeSnapshot = onSnapshot(
          chatsQuery,
          (snapshot) => {
            if (snapshot.empty) {
              setChatMessages(SAMPLE_MESSAGES);
              return;
            }

            const messages: ChatMessage[] = [];
            snapshot.forEach((document) => {
              const data = document.data() as any;
              const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
              const timeString = createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

              if (data.question) {
                messages.push({
                  id: `${document.id}-q`,
                  role: "user",
                  text: data.question,
                  time: timeString,
                  imageUri: data.imageUri || undefined,
                  visionTag: data.visionTag || undefined,
                  confidence: data.confidence || undefined,
                  mobileNetResult: data.mobileNetResult || undefined,
                });
              }
              if (data.answer) {
                messages.push({
                  id: `${document.id}-a`,
                  role: "assistant",
                  text: data.answer,
                  time: timeString,
                });
              }
            });

            if (messages.length > 0) {
              setChatMessages(messages);
            }
          },
          (error) => {
            console.warn("Unable to load chat history:", error?.message);
          }
        );
      } catch (err) {
        console.warn("Firestore subscription error:", err);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [chatMessages, loading]);

  // Send message to AI Backend with MobileNet Visual Analysis support
  const askAI = async (
    customPrompt?: string,
    visualAttachment?: { uri: string; base64?: string; width?: number; height?: number } | null,
    scanResultOverride?: MobileNetResult | null
  ) => {
    const text = (customPrompt ?? message).trim();
    const imageToUse = visualAttachment !== undefined ? visualAttachment : selectedImage;
    let scanToUse = scanResultOverride !== undefined ? scanResultOverride : activeScanResult;

    if (!text && !imageToUse) {
      Alert.alert(
        "Enter a question or scan an image",
        "Please type a query or capture a photo with MobileNet Visual AI."
      );
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Login required", "Please log in before using the AI Assistant.");
      router.replace("/login");
      return;
    }

    if (loading) return;
    setLoading(true);

    // If an image was attached but not yet classified by MobileNet, run classification
    if (imageToUse && !scanToUse) {
      try {
        scanToUse = await classifyImageWithMobileNet(imageToUse.uri, {
          userPrompt: text,
          focusDomain: scannerDomain,
        });
      } catch (err) {
        console.warn("MobileNet classification warning:", err);
      }
    }

    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Instantly append user question with attached image and MobileNet tag
    const userMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      text: text || `[Scanned with MobileNet: ${scanToUse?.primaryClass || "Study Object"}]`,
      time: currentTime,
      imageUri: imageToUse?.uri,
      visionTag: scanToUse?.primaryClass,
      confidence: scanToUse?.confidence,
      mobileNetResult: scanToUse || undefined,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setSelectedImage(null);
    setActiveScanResult(null);

    try {
      let answerText = "";

      // 1. Direct Cloud AI request (works on Mobile Network 4G/5G, Wi-Fi & Internet without backend)
      const historyPayload = chatMessages.slice(-8).map((m) => ({
        role: m.role,
        content: m.text,
      }));

      try {
        answerText = await askCampuslyAI(text, {
          history: historyPayload,
          userContext: {
            name: userName,
            role: "student",
          },
          mobileNetData: scanToUse,
          imageUri: imageToUse?.uri,
        });
      } catch (cloudErr) {
        console.warn("Cloud AI returned error, attempting fallback:", cloudErr);
      }

      // 2. Fallbacks if offline
      if (!answerText && scanToUse) {
        answerText = formatMobileNetStudyExplanation(scanToUse, text);
      } else if (!answerText) {
        answerText = generateIntelligentStudentResponse(text, userName || "Student");
      }

      const assistantMessage: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        role: "assistant",
        text: answerText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, assistantMessage]);

      // Save to Firestore with image & vision details
      try {
        await addDoc(collection(db, "users", user.uid, "aiChats"), {
          question: text || `MobileNet Scan: ${scanToUse?.primaryClass || "Visual Subject"}`,
          answer: answerText,
          imageUri: imageToUse?.uri || null,
          visionTag: scanToUse?.primaryClass || null,
          confidence: scanToUse?.confidence || null,
          createdAt: serverTimestamp(),
        });
      } catch (fsErr) {
        console.warn("Could not save to Firestore:", fsErr);
      }
    } catch (error: any) {
      console.error("AI Error:", error);
      const fallbackReply = scanToUse
        ? formatMobileNetStudyExplanation(scanToUse, text)
        : generateIntelligentStudentResponse(text, userName || "Student");

      setChatMessages((prev) => [
        ...prev,
        {
          id: `fallback-${Date.now()}`,
          role: "assistant",
          text: fallbackReply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Trigger MobileNet classification for an image
  const triggerMobileNetScan = async (uri: string, domain?: VisionDomain) => {
    try {
      setIsAnalyzingVisual(true);
      const result = await classifyImageWithMobileNet(uri, {
        focusDomain: domain || scannerDomain,
      });
      setActiveScanResult(result);
    } catch (err) {
      console.warn("MobileNet scan error:", err);
    } finally {
      setIsAnalyzingVisual(false);
    }
  };

  // Launch mobile camera to capture visual study object with MobileNet
  const handleCameraScan = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Please enable camera access in your mobile settings to scan lab apparatus, circuit diagrams, and textbooks using MobileNet Visual AI."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images" as any],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const imgObj = {
          uri: asset.uri,
          base64: asset.base64 || undefined,
          width: asset.width,
          height: asset.height,
        };
        setSelectedImage(imgObj);
        await triggerMobileNetScan(asset.uri);
        setShowScannerModal(true);
      }
    } catch (err: any) {
      setIsAnalyzingVisual(false);
      Alert.alert("Camera Error", err?.message || "Could not launch camera on this device.");
    }
  };

  // Pick existing photo / diagram from mobile gallery for MobileNet analysis
  const handleGalleryPick = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo Library Permission Required",
          "Please grant photo library access to upload circuit diagrams, lecture notes, or textbook pages for MobileNet analysis."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images" as any],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const imgObj = {
          uri: asset.uri,
          base64: asset.base64 || undefined,
          width: asset.width,
          height: asset.height,
        };
        setSelectedImage(imgObj);
        await triggerMobileNetScan(asset.uri);
        setShowScannerModal(true);
      }
    } catch (err: any) {
      setIsAnalyzingVisual(false);
      Alert.alert("Gallery Error", err?.message || "Could not select photo.");
    }
  };

  const handleVoiceInput = () => {
    setListeningVoice(true);
    setTimeout(() => {
      setListeningVoice(false);
      setMessage("Explain how binary search tree works with time complexity");
    }, 1000);
  };

  const handleAttachment = () => {
    Alert.alert(
      "🔬 MobileNet Visual AI Scanner",
      "Capture or choose a study image, lab equipment, or diagram for deep neural vision analysis:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "📷 Camera Scan (MobileNet)",
          onPress: handleCameraScan,
        },
        {
          text: "🖼️ Pick from Gallery",
          onPress: handleGalleryPick,
        },
        {
          text: "⚡ Open MobileNet HUD",
          onPress: () => setShowScannerModal(true),
        },
      ]
    );
  };

  const handleClearChat = async () => {
    confirmAction(
      "Clear Chat History",
      "Are you sure you want to clear your AI Assistant chat history?",
      async () => {
        const user = auth.currentUser;
        if (!user) {
          setChatMessages(SAMPLE_MESSAGES);
          return;
        }
        try {
          const chatsRef = collection(db, "users", user.uid, "aiChats");
          const snapshot = await getDocs(chatsRef);
          const deletes = snapshot.docs.map((docItem) => deleteDoc(docItem.ref));
          await Promise.all(deletes);
          setChatMessages(SAMPLE_MESSAGES);
          if (Platform.OS === "web") {
            window.alert("Chat history cleared.");
          }
        } catch (err) {
          setChatMessages(SAMPLE_MESSAGES);
        }
      },
      "Clear"
    );
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tab)/home");
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {/* ==================================================== */}
        {/* TOP HEADER */}
        {/* ==================================================== */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: isDark ? colors.border : "#F1F5F9" }]}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={styles.brandRow}>
              <Ionicons name="school" size={20} color={colors.primary} />
              <Text style={[styles.brandTitle, { color: colors.primary }]}>Campusly</Text>
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t("aiAssistant", "AI Assistant")}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {t("aiCompanion", "Your Campusly study companion")}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClearChat}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={19} color={colors.textSecondary} />
            </TouchableOpacity>
            <RobotAvatar size={40} showSparkle={true} />
          </View>
        </View>

        {/* ==================================================== */}
        {/* SCROLLABLE CHAT & QUICK ACTIONS STREAM */}
        {/* ==================================================== */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* GREETING HERO BANNER */}
          <View style={[styles.greetingCard, { backgroundColor: isDark ? colors.card : "#F5F3FF", borderColor: colors.border }]}>
            <RobotAvatar size={48} />
            <View style={styles.greetingTextCol}>
              <Text style={[styles.greetingTitle, { color: colors.text }]}>
                {t("welcomeBack", "Hi")} {userName || "Tuffan"} 👋
              </Text>
              <Text style={[styles.greetingSubtitle, { color: colors.primary }]}>
                {t("howCanIHelp", "How can I help you today?")}
              </Text>
            </View>
          </View>

          {/* MOBILENET VISUAL AI SCANNER HERO BANNER */}
          <View
            style={[
              styles.visionHeroBanner,
              {
                backgroundColor: isDark ? "#1E1B4B" : "#EEF2FF",
                borderColor: isDark ? "#4338CA" : "#C7D2FE",
              },
            ]}
          >
            <View style={styles.visionHeroLeft}>
              <View style={[styles.visionHeroIconBox, { backgroundColor: isDark ? "#312E81" : "#E0E7FF" }]}>
                <Ionicons name="scan" size={24} color="#6366F1" />
                <View style={styles.visionLiveDot} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[styles.visionHeroTitle, { color: colors.text }]}>
                    MobileNet Visual AI
                  </Text>
                  <View style={styles.visionPillBadge}>
                    <Text style={styles.visionPillText}>v2 NEURAL</Text>
                  </View>
                </View>
                <Text style={[styles.visionHeroSubtitle, { color: colors.textSecondary }]}>
                  Snap lab equipment, circuit diagrams, math equations, or notes for instant visual explanations!
                </Text>
              </View>
            </View>

            <View style={styles.visionHeroActionsRow}>
              <TouchableOpacity
                style={[styles.visionSmallActionBtn, { backgroundColor: "#6366F1" }]}
                onPress={handleCameraScan}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={14} color="#FFFFFF" />
                <Text style={styles.visionSmallActionBtnText}>Camera Scan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.visionSmallActionBtn, { backgroundColor: isDark ? "#374151" : "#E2E8F0" }]}
                onPress={handleGalleryPick}
                activeOpacity={0.8}
              >
                <Ionicons name="image" size={14} color={isDark ? "#FFFFFF" : "#334155"} />
                <Text style={[styles.visionSmallActionBtnText, { color: isDark ? "#FFFFFF" : "#334155" }]}>
                  Upload
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.visionSmallActionBtn, { backgroundColor: "#8B5CF6" }]}
                onPress={() => setShowScannerModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="eye" size={14} color="#FFFFFF" />
                <Text style={styles.visionSmallActionBtnText}>HUD</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* QUICK ACTIONS SECTION */}
          <View style={styles.quickActionsContainer}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("quickActions", "Quick Actions")}</Text>
              <TouchableOpacity
                onPress={() => askAI("Help me organize my studies and get started with Campusly AI")}
                activeOpacity={0.7}
              >
                <Text style={[styles.sectionLink, { color: colors.primary }]}>
                  {t("tapToGetStarted", "Tap to get started >")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 2x3 Grid */}
            <View style={styles.grid}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.8}
                  onPress={() => askAI(action.prompt)}
                >
                  <View style={[styles.gridIconBox, { backgroundColor: action.iconBg }]}>
                    <Ionicons name={action.icon} size={20} color={action.iconColor} />
                  </View>
                  <Text style={[styles.gridTitle, { color: colors.text }]} numberOfLines={1}>
                    {t(action.titleKey, action.title)}
                  </Text>
                  <Text style={[styles.gridSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                    {t(action.subtitleKey, action.subtitle)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* CONVERSATION MESSAGES */}
          <View style={styles.chatStream}>
            {chatMessages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.userRow : styles.assistantRow,
                  ]}
                >
                  {!isUser && (
                    <View style={styles.assistantAvatar}>
                      <RobotAvatar size={34} />
                    </View>
                  )}

                  <View
                    style={[
                      styles.bubble,
                      isUser
                        ? [styles.userBubble, { backgroundColor: isDark ? "#4338CA" : "#EDE9FE" }]
                        : [styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }],
                    ]}
                  >
                    {/* Attached Visual Image & MobileNet Vision Tag */}
                    {msg.imageUri && (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setFullScreenImageUri(msg.imageUri || null)}
                        style={styles.chatImageContainer}
                      >
                        <Image
                          source={{ uri: msg.imageUri }}
                          style={styles.chatAttachedImage}
                          resizeMode="cover"
                        />
                        <View style={styles.chatImageOverlayPill}>
                          <Ionicons name="hardware-chip" size={12} color="#FFFFFF" />
                          <Text style={styles.chatImageOverlayText} numberOfLines={1}>
                            MobileNet-v2: {msg.visionTag || "Object Detected"}
                            {msg.confidence ? ` (${(msg.confidence * 100).toFixed(0)}%)` : ""}
                          </Text>
                          <Ionicons name="expand-outline" size={12} color="#FFFFFF" style={{ marginLeft: "auto" }} />
                        </View>
                      </TouchableOpacity>
                    )}

                    {isUser ? (
                      <Text style={[styles.userText, { color: isDark ? "#FFFFFF" : "#1E1B4B" }]}>{msg.text}</Text>
                    ) : (
                      <MarkdownView content={msg.text} baseTextColor={colors.text} />
                    )}

                    <View style={styles.timeRow}>
                      <Text style={[styles.timeText, { color: isUser ? (isDark ? "#C7D2FE" : "#7C3AED") : colors.textSecondary }]}>
                        {msg.time || "10:24 AM"}
                      </Text>
                      {isUser && (
                        <Text style={[styles.checkmarks, { color: isDark ? "#C7D2FE" : "#7C3AED" }]}>✓✓</Text>
                      )}
                    </View>
                  </View>

                  {isUser && (
                    <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
                      <Ionicons name="person" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              );
            })}

            {/* AI THINKING INDICATOR */}
            {loading && (
              <View style={[styles.messageRow, styles.assistantRow]}>
                <View style={styles.assistantAvatar}>
                  <RobotAvatar size={34} />
                </View>
                <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.thinkingText, { color: colors.primary }]}>AI is thinking...</Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* ==================================================== */}
        {/* BOTTOM INPUT BAR */}
        {/* ==================================================== */}
        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          {/* ATTACHED IMAGE PREVIEW BAR */}
          {selectedImage && (
            <View
              style={[
                styles.attachmentPreviewBar,
                { backgroundColor: isDark ? colors.card : "#F1F5F9", borderColor: colors.border },
              ]}
            >
              <Image source={{ uri: selectedImage.uri }} style={styles.attachmentThumb} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Ionicons name="hardware-chip" size={13} color="#6366F1" />
                  <Text style={[styles.attachmentLabel, { color: colors.text }]} numberOfLines={1}>
                    {isAnalyzingVisual
                      ? "MobileNet Neural Scanning..."
                      : activeScanResult
                      ? activeScanResult.primaryClass
                      : "Image Attached"}
                  </Text>
                </View>
                <Text style={[styles.attachmentSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {activeScanResult
                    ? `${activeScanResult.category} • ${(activeScanResult.confidence * 100).toFixed(1)}% confidence`
                    : "Ready for MobileNet Visual AI"}
                </Text>
              </View>

              {activeScanResult && (
                <TouchableOpacity
                  style={styles.attachmentHudBtn}
                  onPress={() => setShowScannerModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="scan" size={13} color="#6366F1" />
                  <Text style={styles.attachmentHudBtnText}>HUD</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.attachmentRemoveBtn}
                onPress={() => {
                  setSelectedImage(null);
                  setActiveScanResult(null);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.inputPill, { backgroundColor: isDark ? colors.background : "#F8FAFC", borderColor: colors.border }]}>
            {/* MobileNet Camera Scan Button */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleCameraScan}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={22} color={colors.primary} />
            </TouchableOpacity>

            {/* Gallery Upload Button */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleGalleryPick}
              activeOpacity={0.7}
            >
              <Ionicons name="images-outline" size={21} color={colors.primary} />
            </TouchableOpacity>

            {/* Attachment Button */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleAttachment}
              activeOpacity={0.7}
            >
              <Ionicons name="attach" size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={message}
              onChangeText={setMessage}
              placeholder={
                selectedImage
                  ? "Ask about this scanned object..."
                  : t("askAnything", "Ask anything about your studies...")
              }
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={1000}
            />

            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleVoiceInput}
              activeOpacity={0.7}
            >
              <Ionicons
                name={listeningVoice ? "mic" : "mic-outline"}
                size={22}
                color={listeningVoice ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: colors.primary },
                (!message.trim() && !selectedImage && !loading) && styles.sendDisabled,
              ]}
              onPress={() => askAI()}
              disabled={loading || (!message.trim() && !selectedImage)}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={15} color="#FFFFFF" style={{ marginLeft: 2 }} />
              )}
            </TouchableOpacity>
          </View>

          {/* DISCLAIMER FOOTER */}
          <View style={styles.disclaimerRow}>
            <Ionicons name="information-circle-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
              {t("aiDisclaimer", "AI can make mistakes. Please verify important information.")}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ==================================================== */}
      {/* MOBILENET VISUAL SCANNER HUD MODAL */}
      {/* ==================================================== */}
      <Modal
        visible={showScannerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowScannerModal(false)}
      >
        <View style={styles.scannerModalOverlay}>
          <View style={[styles.scannerModalCard, { backgroundColor: colors.card }]}>
            {/* HUD Header */}
            <View style={[styles.scannerHeaderRow, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.scannerPulsingDot} />
                <View>
                  <Text style={[styles.scannerTitle, { color: colors.text }]}>MobileNet-v2 Neural Vision</Text>
                  <Text style={{ fontSize: 11, color: "#6366F1", fontWeight: "700" }}>
                    TENSORFLOW LITE • MOBILE ACCELERATED
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.scannerCloseBtn}
                onPress={() => setShowScannerModal(false)}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
              {/* Viewfinder Frame */}
              <View style={styles.viewfinderFrame}>
                {selectedImage ? (
                  <Image
                    source={{ uri: selectedImage.uri }}
                    style={styles.viewfinderImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.viewfinderPlaceholder}>
                    <Ionicons name="scan-circle-outline" size={60} color="#6366F1" />
                    <Text style={styles.viewfinderPlaceholderText}>
                      No image active. Capture with camera or pick from gallery below:
                    </Text>
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                      <TouchableOpacity
                        style={[styles.scannerActionPill, { backgroundColor: "#6366F1" }]}
                        onPress={handleCameraScan}
                      >
                        <Ionicons name="camera" size={16} color="#FFFFFF" />
                        <Text style={styles.scannerActionPillText}>Camera Scan</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.scannerActionPill, { backgroundColor: "#475569" }]}
                        onPress={handleGalleryPick}
                      >
                        <Ionicons name="images" size={16} color="#FFFFFF" />
                        <Text style={styles.scannerActionPillText}>Upload Photo</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* HUD Reticle Overlay */}
                {selectedImage && (
                  <>
                    <View style={[styles.hudReticleCorner, styles.hudCornerTL]} />
                    <View style={[styles.hudReticleCorner, styles.hudCornerTR]} />
                    <View style={[styles.hudReticleCorner, styles.hudCornerBL]} />
                    <View style={[styles.hudReticleCorner, styles.hudCornerBR]} />
                    <View style={styles.hudScanLine} />

                    <View style={styles.hudTelemetryPill}>
                      <Text style={styles.hudTelemetryText}>
                        RES: 224x224 • CONV: DEPTHWISE SEPARABLE • {activeScanResult ? `${activeScanResult.modelInfo.latencyMs}ms` : "SCANNING..."}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Classification Analysis Card */}
              {activeScanResult && (
                <View
                  style={[
                    styles.recognitionResultCard,
                    {
                      backgroundColor: isDark ? "#1E1B4B" : "#F5F3FF",
                      borderColor: isDark ? "#4338CA" : "#C7D2FE",
                    },
                  ]}
                >
                  <View style={styles.recognitionHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recognitionSuperLabel}>IDENTIFIED ACADEMIC SUBJECT</Text>
                      <Text style={[styles.recognitionClassTitle, { color: colors.text }]}>
                        {activeScanResult.primaryClass}
                      </Text>
                      <Text style={[styles.recognitionCategoryText, { color: colors.primary }]}>
                        {activeScanResult.category}
                      </Text>
                    </View>

                    <View style={styles.confidenceCircleBadge}>
                      <Text style={styles.confidenceValueText}>
                        {(activeScanResult.confidence * 100).toFixed(1)}%
                      </Text>
                      <Text style={styles.confidenceLabelText}>CONFIDENCE</Text>
                    </View>
                  </View>

                  {/* Confidence meter bar */}
                  <View style={styles.confidenceBarBg}>
                    <View
                      style={[
                        styles.confidenceBarFill,
                        { width: `${Math.min(100, activeScanResult.confidence * 100)}%` },
                      ]}
                    />
                  </View>

                  {/* Top Candidate Classes */}
                  <View style={styles.candidateRow}>
                    {activeScanResult.topPredictions.slice(1, 3).map((pred) => (
                      <View key={pred.classId} style={styles.candidatePill}>
                        <Text style={styles.candidateLabel} numberOfLines={1}>
                          {pred.label}: {(pred.confidence * 100).toFixed(0)}%
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Domain Switcher */}
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.domainSectionTitle, { color: colors.textSecondary }]}>
                  ACADEMIC DOMAIN FILTER
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.domainScroll}>
                  {(
                    [
                      { id: "all", label: "🌐 All Domains" },
                      { id: "electronics", label: "⚡ Electronics & Lab" },
                      { id: "optics_chemistry", label: "🔬 Optics & Chemistry" },
                      { id: "cs_hardware", label: "💻 CS & Embedded" },
                      { id: "diagrams_math", label: "📐 Diagrams & Math" },
                      { id: "notes_textbook", label: "📖 Notes & Books" },
                    ] as const
                  ).map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      style={[
                        styles.domainPill,
                        { backgroundColor: isDark ? colors.background : "#F1F5F9" },
                        scannerDomain === d.id && { backgroundColor: colors.primary },
                      ]}
                      onPress={async () => {
                        setScannerDomain(d.id);
                        if (selectedImage) {
                          await triggerMobileNetScan(selectedImage.uri, d.id);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.domainPillText,
                          { color: colors.textSecondary },
                          scannerDomain === d.id && { color: "#FFFFFF", fontWeight: "700" },
                        ]}
                      >
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Quick Visual Queries */}
              {activeScanResult && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.domainSectionTitle, { color: colors.textSecondary }]}>
                    INSTANT ACADEMIC ACTIONS
                  </Text>

                  <View style={styles.quickVisualActionsGrid}>
                    <TouchableOpacity
                      style={[styles.quickVisualBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        setShowScannerModal(false);
                        askAI(
                          `Explain the concepts and working principle of ${activeScanResult.primaryClass}`,
                          selectedImage,
                          activeScanResult
                        );
                      }}
                    >
                      <Ionicons name="school" size={16} color="#FFFFFF" />
                      <Text style={styles.quickVisualBtnText}>Explain Concepts</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.quickVisualBtn, { backgroundColor: "#0284C7" }]}
                      onPress={() => {
                        setShowScannerModal(false);
                        askAI(
                          `What are the critical governing formulas and equations for ${activeScanResult.primaryClass}?`,
                          selectedImage,
                          activeScanResult
                        );
                      }}
                    >
                      <Ionicons name="calculator" size={16} color="#FFFFFF" />
                      <Text style={styles.quickVisualBtnText}>Formulas & Theory</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.quickVisualBtn, { backgroundColor: "#16A34A" }]}
                      onPress={() => {
                        setShowScannerModal(false);
                        askAI(
                          `Give me top university exam and viva questions with answers about ${activeScanResult.primaryClass}`,
                          selectedImage,
                          activeScanResult
                        );
                      }}
                    >
                      <Ionicons name="ribbon" size={16} color="#FFFFFF" />
                      <Text style={styles.quickVisualBtnText}>Exam / Viva Q&A</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.quickVisualBtn, { backgroundColor: "#D97706" }]}
                      onPress={() => {
                        setShowScannerModal(false);
                        askAI(
                          `What is the standard lab procedure and safety precautions for ${activeScanResult.primaryClass}?`,
                          selectedImage,
                          activeScanResult
                        );
                      }}
                    >
                      <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
                      <Text style={styles.quickVisualBtnText}>Lab Procedure</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Retake / Upload Buttons */}
              <View style={styles.scannerBottomActionsRow}>
                <TouchableOpacity
                  style={[styles.scannerFooterBtn, { backgroundColor: isDark ? colors.border : "#F1F5F9" }]}
                  onPress={handleCameraScan}
                >
                  <Ionicons name="camera" size={18} color={colors.text} />
                  <Text style={[styles.scannerFooterBtnText, { color: colors.text }]}>Retake Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.scannerFooterBtn, { backgroundColor: isDark ? colors.border : "#F1F5F9" }]}
                  onPress={handleGalleryPick}
                >
                  <Ionicons name="images" size={18} color={colors.text} />
                  <Text style={[styles.scannerFooterBtnText, { color: colors.text }]}>Pick Gallery</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* FULL-SCREEN IMAGE VIEWER MODAL */}
      {/* ==================================================== */}
      <Modal
        visible={!!fullScreenImageUri}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImageUri(null)}
      >
        <View style={styles.fullScreenOverlay}>
          <TouchableOpacity
            style={styles.fullScreenCloseBtn}
            onPress={() => setFullScreenImageUri(null)}
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>

          {fullScreenImageUri && (
            <Image
              source={{ uri: fullScreenImageUri }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  keyboardContainer: {
    flex: 1,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#3B28CC",
    marginLeft: 5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 1,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 10,
  },
  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ROBOT AVATAR */
  robotWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  robotCircle: {
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  antennaStem: {
    position: "absolute",
    top: 2,
    width: 2,
    height: 6,
    backgroundColor: "#6366F1",
  },
  antennaBall: {
    position: "absolute",
    top: 0,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#8B5CF6",
  },
  earPill: {
    position: "absolute",
    top: "38%",
    width: 3,
    height: 10,
    borderRadius: 1.5,
    backgroundColor: "#6366F1",
  },
  robotHead: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#C7D2FE",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  robotVisor: {
    backgroundColor: "#1E1B4B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 3,
  },
  robotEye: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: "#38BDF8",
  },
  sparkleBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 1,
    elevation: 2,
  },

  /* SCROLL CONTENT */
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  /* GREETING CARD */
  greetingCard: {
    backgroundColor: "#F5F3FF",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9E5FF",
  },
  greetingTextCol: {
    marginLeft: 10,
    flex: 1,
  },
  greetingTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  greetingSubtitle: {
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "500",
    marginTop: 2,
  },

  /* QUICK ACTIONS */
  quickActionsContainer: {
    marginTop: 12,
    paddingHorizontal: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionLink: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#6366F1",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridCard: {
    width: "48.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  gridIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  gridSubtitle: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 13,
  },

  /* CHAT STREAM */
  chatStream: {
    marginTop: 10,
    paddingHorizontal: 12,
  },
  messageRow: {
    flexDirection: "row",
    marginVertical: 6,
    alignItems: "flex-end",
  },
  userRow: {
    justifyContent: "flex-end",
  },
  assistantRow: {
    justifyContent: "flex-start",
  },
  assistantAvatar: {
    marginRight: 6,
    marginBottom: 2,
  },
  userAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 14,
  },
  userBubble: {
    backgroundColor: "#EDE9FE",
    borderTopRightRadius: 3,
  },
  assistantBubble: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 3,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  thinkingText: {
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "500",
    marginLeft: 6,
  },
  userText: {
    fontSize: 13,
    color: "#1E1B4B",
    lineHeight: 18,
    fontWeight: "500",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
  },
  timeText: {
    fontSize: 9.5,
    color: "#94A3B8",
  },
  checkmarks: {
    fontSize: 10,
    color: "#7C3AED",
    marginLeft: 3,
    fontWeight: "700",
  },

  /* BOTTOM INPUT BAR */
  bottomBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 16 : 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  inputPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 22,
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === "ios" ? 4 : 2,
  },
  iconButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    paddingHorizontal: 6,
    maxHeight: 80,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#5832A8",
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.6,
  },
  disclaimerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  disclaimerText: {
    fontSize: 10,
    color: "#94A3B8",
    marginLeft: 3,
  },

  /* ==================================================== */
  /* MOBILENET VISUAL AI STYLES */
  /* ==================================================== */
  visionHeroBanner: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  visionHeroLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  visionHeroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  visionLiveDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  visionHeroTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  visionPillBadge: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  visionPillText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  visionHeroSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  visionHeroActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(99, 102, 241, 0.15)",
  },
  visionSmallActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  visionSmallActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  /* CHAT ATTACHED IMAGE */
  chatImageContainer: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.25)",
  },
  chatAttachedImage: {
    width: "100%",
    height: 180,
    borderRadius: 13,
  },
  chatImageOverlayPill: {
    position: "absolute",
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chatImageOverlayText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "700",
    flex: 1,
  },

  /* ATTACHMENT PREVIEW BAR ABOVE INPUT */
  attachmentPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  attachmentThumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  attachmentLabel: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  attachmentSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  attachmentHudBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 3,
    marginRight: 6,
  },
  attachmentHudBtnText: {
    color: "#6366F1",
    fontSize: 11,
    fontWeight: "800",
  },
  attachmentRemoveBtn: {
    padding: 3,
  },

  /* MOBILENET SCANNER HUD MODAL */
  scannerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "flex-end",
  },
  scannerModalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 20,
    maxHeight: "92%",
  },
  scannerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  scannerPulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
  scannerTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  scannerCloseBtn: {
    padding: 4,
  },
  viewfinderFrame: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#6366F1",
  },
  viewfinderImage: {
    width: "100%",
    height: "100%",
  },
  viewfinderPlaceholder: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  viewfinderPlaceholderText: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
  },
  scannerActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  scannerActionPillText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },

  /* HUD RETICLE OVERLAYS */
  hudReticleCorner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#38BDF8",
  },
  hudCornerTL: {
    top: 12,
    left: 12,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  hudCornerTR: {
    top: 12,
    right: 12,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  hudCornerBL: {
    bottom: 12,
    left: 12,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  hudCornerBR: {
    bottom: 12,
    right: 12,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  hudScanLine: {
    position: "absolute",
    top: "48%",
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: "rgba(56, 189, 248, 0.75)",
    shadowColor: "#38BDF8",
    shadowRadius: 8,
    shadowOpacity: 0.8,
  },
  hudTelemetryPill: {
    position: "absolute",
    bottom: 8,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
  },
  hudTelemetryText: {
    color: "#38BDF8",
    fontSize: 9,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "700",
  },

  /* RECOGNITION RESULTS */
  recognitionResultCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  recognitionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  recognitionSuperLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#6366F1",
    letterSpacing: 0.5,
  },
  recognitionClassTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  recognitionCategoryText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  confidenceCircleBadge: {
    alignItems: "center",
    backgroundColor: "#6366F1",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  confidenceValueText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  confidenceLabelText: {
    color: "#E0E7FF",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  confidenceBarBg: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    borderRadius: 3,
    marginTop: 10,
    overflow: "hidden",
  },
  confidenceBarFill: {
    height: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 3,
  },
  candidateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  candidatePill: {
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  candidateLabel: {
    fontSize: 10.5,
    color: "#4338CA",
    fontWeight: "600",
  },

  /* DOMAIN FILTER PILLS */
  domainSectionTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  domainScroll: {
    flexDirection: "row",
  },
  domainPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 8,
  },
  domainPillText: {
    fontSize: 11.5,
    fontWeight: "600",
  },

  /* QUICK VISUAL ACTIONS */
  quickVisualActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickVisualBtn: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 6,
  },
  quickVisualBtnText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
    flex: 1,
  },
  scannerBottomActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  scannerFooterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  scannerFooterBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },

  /* FULL-SCREEN IMAGE VIEWER */
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
  },
  fullScreenImage: {
    width: SCREEN_WIDTH * 0.94,
    height: "75%",
  },
});
