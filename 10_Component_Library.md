# 10_Component_Library: VisionOS UI Component Contracts & Implementation Specifications

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Enterprise UI Component Library & TypeScript Interface Contracts |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Lead Frontend Architect, Principal UX Designer |
| **Purpose** | To define the exhaustive, production-ready atomic, molecular, and organism UI components deployed across VisionOS mobile (`apps/mobile`) and web (`apps/web`) interfaces, including strict TypeScript interface contracts, ARIA tags, and concrete React / React Native code implementations. |
| **Scope** | Enforced across `@visionos/shared/components`, `apps/mobile/components`, and `apps/web/src/components`. |
| **Assumptions** | 1. Mobile components run on React Native with `react-native-reanimated` and `@gorhom/bottom-sheet`.<br>2. Web components run on Next.js 15 App Router (`React 19 Server & Client Components`). |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `01_PRD.md` — Product Requirements Document<br>• `03_UI_UX_Design_System.md` — Design Tokens & Glassmorphism Rules<br>• `29_Coding_Standards.md` — Enterprise Coding Standards |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Lead Frontend Architect | Initial production release of the 7 primary VisionOS Organism Components (`ARNavigationOverlay`, `VendorCard`, `AIChatSheet`, `SensoryAlertSnackbar`, `QuickReportModal`, `EmergencyEvacBanner`, `Stadium3DCanvas`). |

---

## 1. Component Architecture & Atomic Classification

All UI building blocks adhere to Atomic Design methodology, strictly utilizing the design tokens defined in `03_UI_UX_Design_System.md`:

```mermaid
graph TD
  subgraph Atoms [Atomic Primitives (`@visionos/shared/atoms`)]
    Button[`QuantumButton.tsx`]
    Badge[`StatusBadge.tsx`]
    Icon[`IconVector.tsx`]
    Input[`TextInputField.tsx`]
  end

  subgraph Molecules [Molecular Assemblies (`@visionos/shared/molecules`)]
    Card[`VendorCard.tsx`]
    Snackbar[`SensoryAlertSnackbar.tsx`]
    Report[`QuickReportModal.tsx`]
  end

  subgraph Organisms [Full Application Organisms (`apps/mobile` & `apps/web`)]
    AR[`ARNavigationOverlay.tsx` <br> (`apps/mobile`)]
    Chat[`AIChatSheet.tsx` <br> (`apps/mobile`)]
    Emergency[`EmergencyEvacBanner.tsx` <br> (`Both`)]
    Canvas[`Stadium3DCanvas.tsx` <br> (`apps/web`)]
  end

  Atoms --> Molecules
  Molecules --> Organisms
```

---

## 2. Component 1: `ARNavigationOverlay.tsx` (`apps/mobile` Organism)

Projects high-contrast `#00F0FF` directional chevrons onto the physical concourse floor plane via mobile camera view (`FR-NAV-003`).

### 2.1 TypeScript Interface Prop Contract
```ts
export interface RouteStep {
  readonly stepId: string;
  readonly instruction: string;
  readonly distanceMeters: number;
  readonly targetAngleDegrees: number;
  readonly isAdaCompliant: boolean;
}

export interface ARNavigationOverlayProps {
  /** Active calculated graph route step list */
  readonly activeSteps: readonly RouteStep[];
  /** Current index inside activeSteps */
  readonly currentStepIndex: number;
  /** True when user deviates > 5m from active graph edge */
  readonly isOffRoute: boolean;
  /** True when audio navigation instructions are enabled */
  readonly isAudioEnabled: boolean;
  /** Callback triggered when user manually requests step recalculation */
  readonly onRecalculateRoute: () => void;
  /** Callback triggered when user toggles audio mute */
  readonly onToggleAudio: () => void;
}
```

### 2.2 Production React Native Implementation (`apps/mobile/components/navigation/ARNavigationOverlay.tsx`)
```tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView } from 'expo-camera';
import Animated, { useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

export function ARNavigationOverlay({
  activeSteps,
  currentStepIndex,
  isOffRoute,
  onRecalculateRoute,
}: ARNavigationOverlayProps): React.JSX.Element {
  const currentStep = activeSteps[currentStepIndex];

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: withRepeat(withTiming(0.4, { duration: 800 }), -1, true),
  }));

  if (isOffRoute) {
    return (
      <View style={styles.offRouteContainer} accessibilityRole="alert" aria-live="assertive">
        <Text style={styles.offRouteText}>OFF ROUTE DETECTED (>5m Delta)</Text>
        <TouchableOpacity
          style={styles.recalcButton}
          onPress={onRecalculateRoute}
          accessibilityLabel="Recalculate route to assigned seat"
        >
          <Text style={styles.recalcButtonText}>RECALCULATE NOW</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFillObject} facing="back">
        <View style={styles.chevronContainer}>
          <Animated.View style={[styles.arVectorArrow, pulseStyle]}>
            <Text style={styles.chevronSymbol}>^</Text>
            <Text style={styles.chevronAngle}>{currentStep?.targetAngleDegrees || 0}°</Text>
          </Animated.View>
        </View>
      </CameraView>

      <View style={styles.hudOverlay}>
        <View style={styles.stepCard}>
          <Text style={styles.instructionText}>{currentStep?.instruction || 'Proceed forward along concourse'}</Text>
          <Text style={styles.distanceText}>Distance: {currentStep?.distanceMeters || 0} meters</Text>
          {currentStep?.isAdaCompliant && (
            <View style={styles.adaBadge}>
              <Text style={styles.adaBadgeText}>ADA Step-Free Verified</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  chevronContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  arVectorArrow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 240, 255, 0.25)',
    borderWidth: 3,
    borderColor: '#00F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronSymbol: { fontSize: 48, fontWeight: '700', color: '#00F0FF' },
  chevronAngle: { fontSize: 14, fontWeight: '600', color: '#F0F6FC' },
  hudOverlay: { position: 'absolute', bottom: 40, left: 16, right: 16 },
  stepCard: {
    backgroundColor: 'rgba(22, 27, 34, 0.85)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  instructionText: { fontSize: 18, fontWeight: '600', color: '#F0F6FC', marginBottom: 8 },
  distanceText: { fontSize: 14, color: '#8B949E' },
  adaBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  adaBadgeText: { fontSize: 12, fontWeight: '600', color: '#00F0FF' },
  offRouteContainer: {
    flex: 1,
    backgroundColor: '#FF1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  offRouteText: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 20, textAlign: 'center' },
  recalcButton: { backgroundColor: '#FFFFFF', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12 },
  recalcButtonText: { fontSize: 16, fontWeight: '700', color: '#FF1E1E' },
});
```

---

## 3. Component 2: `VendorCard.tsx` (`apps/mobile` Molecule)

Displays real-time estimated wait times ($T_{wait}$) across food and beverage concessions, updating via live Firestore listeners (`FR-CRD-003`).

### 3.1 TypeScript Interface Prop Contract
```ts
export type WaitTimeStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';

export interface VendorCardProps {
  readonly vendorId: string;
  readonly vendorName: string;
  readonly category: 'HALAL' | 'VEGAN' | 'BEVERAGE' | 'GRILL' | 'SNACKS';
  readonly locationConcourse: string;
  readonly queuePersonCount: number;
  readonly estimatedWaitMinutes: number;
  readonly status: WaitTimeStatus;
  readonly onSelectVendor: (vendorId: string) => void;
}
```

### 3.2 Production React Native Implementation (`apps/mobile/components/ordering/VendorCard.tsx`)
```tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VendorCardProps } from './VendorCard.types';

export function VendorCard({
  vendorId,
  vendorName,
  category,
  locationConcourse,
  estimatedWaitMinutes,
  status,
  onSelectVendor,
}: VendorCardProps): React.JSX.Element {
  const getBadgeColor = (): string => {
    switch (status) {
      case 'NORMAL': return '#00E676';
      case 'WARNING': return '#FFAB00';
      case 'CRITICAL': return '#FF1E1E';
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onSelectVendor(vendorId)}
      accessibilityRole="button"
      accessibilityLabel={`Select ${vendorName}, located at ${locationConcourse}. Estimated wait time ${estimatedWaitMinutes} minutes.`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.vendorName}>{vendorName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getBadgeColor() }]}>
          <Text style={styles.statusText}>{estimatedWaitMinutes} MIN WAIT</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <Text style={styles.categoryText}>{category}</Text>
        <Text style={styles.locationText}>• {locationConcourse}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161B22',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    minHeight: 88,
    justifyContent: 'center',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  vendorName: { fontSize: 18, fontWeight: '600', color: '#F0F6FC' },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#0D1117' },
  detailsRow: { flexDirection: 'row', alignItems: 'center' },
  categoryText: { fontSize: 14, fontWeight: '500', color: '#00F0FF' },
  locationText: { fontSize: 14, color: '#8B949E', marginLeft: 8 },
});
```

---

## 4. Component 3: `AIChatSheet.tsx` (`apps/mobile` Organism)

Bottom-sheet interface integrating single-tap Push-to-Talk (`PTT`) speech-to-speech translation with Gemini 1.5 Flash (`FR-LAN-001`, `FR-LAN-002`).

### 4.1 TypeScript Interface Prop Contract
```ts
export interface ChatMessage {
  readonly messageId: string;
  readonly sender: 'USER' | 'AI_CONCIERGE';
  readonly textContent: string;
  readonly detectedLanguageCode?: string;
  readonly timestampUtc: string;
  readonly isStreaming?: boolean;
}

export interface AIChatSheetProps {
  readonly isVisible: boolean;
  readonly messageHistory: readonly ChatMessage[];
  readonly isRecordingAudio: boolean;
  readonly onSendMessage: (text: string) => void;
  readonly onStartPushToTalk: () => void;
  readonly onStopPushToTalk: () => void;
  readonly onCloseSheet: () => void;
}
```

### 4.2 Production React Native Implementation (`apps/mobile/components/modals/AIChatSheet.tsx`)
```tsx
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { AIChatSheetProps, ChatMessage } from './AIChatSheet.types';

export function AIChatSheet({
  isVisible,
  messageHistory,
  isRecordingAudio,
  onSendMessage,
  onStartPushToTalk,
  onStopPushToTalk,
  onCloseSheet,
}: AIChatSheetProps): React.JSX.Element | null {
  const [inputText, setInputText] = useState<string>('');

  if (!isVisible) {
    return null;
  }

  const handleSendText = (): void => {
    if (inputText.trim().length > 0) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const renderBubble = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'USER';
    return (
      <View style={[styles.bubbleWrapper, isUser ? styles.bubbleRight : styles.bubbleLeft]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={styles.bubbleText}>{item.textContent}</Text>
          {item.isStreaming && <Text style={styles.streamingIndicator}>• • •</Text>}
        </View>
      </View>
    );
  };

  return (
    <BottomSheet index={1} snapPoints={['25%', '60%', '95%']} onClose={onCloseSheet} backgroundStyle={styles.sheetBg}>
      <BottomSheetView style={styles.sheetContainer}>
        <View style={styles.sheetHeader}>
          <Text style={styles.headerTitle}>Gemini Multilingual Concierge (`40+ Languages`)</Text>
          <TouchableOpacity onPress={onCloseSheet} accessibilityLabel="Close AI Concierge Sheet">
            <Text style={styles.closeBtn}>X</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={messageHistory}
          keyExtractor={(item) => item.messageId}
          renderItem={renderBubble}
          contentContainerStyle={styles.chatList}
        />

        <View style={styles.inputBar}>
          <TouchableOpacity
            style={[styles.pttButton, isRecordingAudio && styles.pttButtonActive]}
            onPressIn={onStartPushToTalk}
            onPressOut={onStopPushToTalk}
            accessibilityRole="button"
            accessibilityLabel="Push to Talk. Hold and speak in any language."
          >
            <Text style={styles.pttButtonText}>{isRecordingAudio ? 'LISTENING...' : 'HOLD TO SPEAK'}</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Ask about Gate 4, Halal food..."
            placeholderTextColor="#8B949E"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSendText}
          />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: '#161B22', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetContainer: { flex: 1, paddingHorizontal: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#00F0FF' },
  closeBtn: { fontSize: 18, fontWeight: '700', color: '#8B949E' },
  chatList: { paddingBottom: 16 },
  bubbleWrapper: { marginVertical: 6, flexDirection: 'row' },
  bubbleRight: { justifyContent: 'flex-end' },
  bubbleLeft: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 14 },
  userBubble: { backgroundColor: '#0284C7', borderBottomRightRadius: 2 },
  aiBubble: { backgroundColor: '#21262D', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  bubbleText: { fontSize: 15, color: '#F0F6FC', lineHeight: 22 },
  streamingIndicator: { fontSize: 12, color: '#7000FF', marginTop: 4, fontWeight: '700' },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#21262D' },
  pttButton: { backgroundColor: '#00F0FF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginRight: 8 },
  pttButtonActive: { backgroundColor: '#FF1E1E' },
  pttButtonText: { fontSize: 13, fontWeight: '700', color: '#0D1117' },
  textInput: { flex: 1, backgroundColor: '#21262D', color: '#F0F6FC', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
});
```

---

## 5. Component 4: `SensoryAlertSnackbar.tsx` (`apps/mobile` Molecule)

Dispatches haptic/visual warnings when approaching acoustic ($>95\text{ dB}$) or visual strobe overload zones (`FR-ACC-002`).

### 5.1 TypeScript Interface Prop Contract
```ts
export interface SensoryAlertSnackbarProps {
  readonly isVisible: boolean;
  readonly zoneName: string;
  readonly currentDecibels: number;
  readonly hasActiveStrobeLights: boolean;
  readonly onAcceptQuietReroute: () => void;
  readonly onDismissAlert: () => void;
}
```

### 5.2 Production React Native Implementation (`apps/mobile/components/alerts/SensoryAlertSnackbar.tsx`)
```tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SensoryAlertSnackbarProps } from './SensoryAlertSnackbar.types';

export function SensoryAlertSnackbar({
  isVisible,
  zoneName,
  currentDecibels,
  hasActiveStrobeLights,
  onAcceptQuietReroute,
  onDismissAlert,
}: SensoryAlertSnackbarProps): React.JSX.Element | null {
  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.snackbarContainer} accessibilityRole="alert" aria-live="assertive">
      <View style={styles.contentRow}>
        <Text style={styles.alertHeader}>⚠️ SENSORY OVERLOAD DETECTED</Text>
        <Text style={styles.alertDetail}>
          {zoneName}: {currentDecibels} dB {hasActiveStrobeLights ? '+ Active Strobe Lighting' : ''}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.rerouteBtn} onPress={onAcceptQuietReroute}>
          <Text style={styles.rerouteBtnText}>SWITCH TO QUIET ROUTE (<85 dB)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismissAlert}>
          <Text style={styles.dismissBtnText}>DISMISS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  snackbarContainer: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    backgroundColor: '#21262D',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FFAB00',
    elevation: 8,
    zIndex: 9999,
  },
  contentRow: { marginBottom: 12 },
  alertHeader: { fontSize: 16, fontWeight: '700', color: '#FFAB00', marginBottom: 4 },
  alertDetail: { fontSize: 14, color: '#F0F6FC' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rerouteBtn: { backgroundColor: '#FFAB00', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  rerouteBtnText: { fontSize: 13, fontWeight: '700', color: '#0D1117' },
  dismissBtn: { paddingVertical: 10, paddingHorizontal: 12 },
  dismissBtnText: { fontSize: 13, fontWeight: '600', color: '#8B949E' },
});
```

---

## 6. Component 5: `QuickReportModal.tsx` (`apps/mobile` Molecule)

Two-tap hazard reporting modal for volunteer staff (`ROLE_VOLUNTEER`) with automatic BLE beacon location injection (`FR-COP-002`).

### 6.1 TypeScript Interface Prop Contract
```ts
export type HazardCategory = 'SPILL' | 'MEDICAL_EMERGENCY' | 'OVERCROWD' | 'TURNSTILE_JAM';

export interface QuickReportModalProps {
  readonly isVisible: boolean;
  readonly nearestBeaconAnchorId: string;
  readonly currentConcourseLevel: string;
  readonly isSubmitting: boolean;
  readonly onSubmitHazardReport: (category: HazardCategory, notes?: string) => Promise<void>;
  readonly onCloseModal: () => void;
}
```

### 6.2 Production React Native Implementation (`apps/mobile/components/modals/QuickReportModal.tsx`)
```tsx
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { HazardCategory, QuickReportModalProps } from './QuickReportModal.types';

export function QuickReportModal({
  isVisible,
  nearestBeaconAnchorId,
  currentConcourseLevel,
  isSubmitting,
  onSubmitHazardReport,
  onCloseModal,
}: QuickReportModalProps): React.JSX.Element {
  const categories: readonly { id: HazardCategory; label: string; color: string }[] = [
    { id: 'SPILL', label: 'Spill / Maintenance', color: '#FFAB00' },
    { id: 'MEDICAL_EMERGENCY', label: 'Medical Emergency', color: '#FF1E1E' },
    { id: 'OVERCROWD', label: 'Concourse Bottleneck', color: '#FFAB00' },
    { id: 'TURNSTILE_JAM', label: 'Turnstile Jammed', color: '#00F0FF' },
  ];

  return (
    <Modal visible={isVisible} animationType="fade" transparent onRequestClose={onCloseModal}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.title}>2-Tap Incident Report (`ROLE_VOLUNTEER`)</Text>
          <Text style={styles.locationTag}>
            Automatic BLE Anchor: {nearestBeaconAnchorId} • {currentConcourseLevel}
          </Text>

          <View style={styles.grid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryCard, { borderColor: cat.color }]}
                disabled={isSubmitting}
                onPress={() => void onSubmitHazardReport(cat.id)}
                accessibilityLabel={`Report ${cat.label}`}
              >
                <Text style={[styles.categoryLabel, { color: cat.color }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onCloseModal} disabled={isSubmitting}>
            <Text style={styles.cancelText}>{isSubmitting ? 'SUBMITTING TO COP...' : 'CANCEL'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', paddingHorizontal: 20 },
  modalCard: { backgroundColor: '#161B22', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  title: { fontSize: 20, fontWeight: '700', color: '#F0F6FC', marginBottom: 4 },
  locationTag: { fontSize: 13, color: '#8B949E', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: {
    width: '48%',
    backgroundColor: '#21262D',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  cancelButton: { marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#8B949E' },
});
```

---

## 7. Component 6: `EmergencyEvacBanner.tsx` (`apps/mobile` & `apps/web` Organism)

Maximum-contrast emergency evacuation lockout banner triggered upon `EMERGENCY_OVERRIDE` WebSocket payloads (`FR-EMR-002`).

### 7.1 TypeScript Interface Prop Contract
```ts
export interface EmergencyEvacBannerProps {
  readonly isEmergencyActive: boolean;
  readonly targetSafeGateNumber: string;
  readonly evacuationReason: string;
  readonly isStepFreeVerified: boolean;
  readonly onConfirmPerimeterSafeZone: () => void;
}
```

### 7.2 Production React Implementation (`apps/web/src/components/emergency/EmergencyEvacBanner.tsx`)
```tsx
import React from 'react';

export function EmergencyEvacBanner({
  isEmergencyActive,
  targetSafeGateNumber,
  evacuationReason,
  isStepFreeVerified,
  onConfirmPerimeterSafeZone,
}: EmergencyEvacBannerProps): React.JSX.Element | null {
  if (!isEmergencyActive) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FF1E1E',
        color: '#FFFFFF',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        textAlign: 'center',
        fontFamily: 'Outfit, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '48px', fontWeight: 800, marginBottom: '16px', letterSpacing: '-0.03em' }}>
        ⚠️ CRITICAL EMERGENCY EVACUATION ORDER ⚠️
      </h1>
      <p style={{ fontSize: '24px', fontWeight: 600, marginBottom: '40px' }}>
        REASON: {evacuationReason.toUpperCase()} — DO NOT REMAIN IN SEATING TIERS
      </p>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          color: '#FF1E1E',
          padding: '32px 48px',
          borderRadius: '24px',
          boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
          marginBottom: '48px',
        }}
      >
        <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>PROCEED IMMEDIATELY TO</div>
        <div style={{ fontSize: '64px', fontWeight: 800 }}>GATE {targetSafeGateNumber}</div>
        {isStepFreeVerified && (
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#0284C7', marginTop: '12px' }}>
            ✓ ADA Step-Free Route & Green Corridor Cleared
          </div>
        )}
      </div>

      <button
        onClick={onConfirmPerimeterSafeZone}
        style={{
          backgroundColor: '#0D1117',
          color: '#FFFFFF',
          border: '2px solid #FFFFFF',
          padding: '20px 40px',
          fontSize: '16px',
          fontWeight: 700,
          borderRadius: '16px',
          cursor: 'pointer',
        }}
      >
        [ I AM IN A SAFE ZONE OUTSIDE THE STADIUM PERIMETER ]
      </button>
    </div>
  );
}
```

---

## 8. Component 7: `Stadium3DCanvas.tsx` (`apps/web` Organism)

60 FPS 3D digital twin canvas (`WebGL / Three.js`) for the Organizer COP Dashboard (`FR-COP-001`), highlighting real-time concourse crowd density polygons.

### 8.1 TypeScript Interface Prop Contract
```ts
export interface ZoneDensityPolygon {
  readonly zoneId: string;
  readonly concourseLevel: string;
  readonly currentDensityPerSqM: number;
  readonly coordinates3d: readonly [number, number, number][];
}

export interface Stadium3DCanvasProps {
  readonly activeZonePolygons: readonly ZoneDensityPolygon[];
  readonly selectedZoneId: string | null;
  readonly onSelectZonePolygon: (zoneId: string) => void;
  readonly onCameraRotate: (pitch: number, yaw: number) => void;
}
```

### 8.2 Production Next.js 15 Client Component (`apps/web/src/components/cop/Stadium3DCanvas.tsx`)
```tsx
'use client';

import React, { useRef } from 'react';
import { Stadium3DCanvasProps, ZoneDensityPolygon } from './Stadium3DCanvas.types';

export function Stadium3DCanvas({
  activeZonePolygons,
  selectedZoneId,
  onSelectZonePolygon,
}: Stadium3DCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const getPolygonColor = (density: number): string => {
    if (density >= 3.5) return '#FF1E1E'; // CRITICAL
    if (density >= 2.5) return '#FFAB00'; // WARNING
    return '#00E676'; // NORMAL
  };

  return (
    <div
      ref={canvasRef}
      style={{
        flex: 1,
        backgroundColor: '#0D1117',
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.12)',
      }}
      aria-label="3D Digital Twin Stadium Canvas"
    >
      {/* WebGL Canvas Mount Container */}
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#8B949E', fontSize: '16px', fontFamily: 'Inter, sans-serif' }}>
          [WebGL Three.js 60 FPS Canvas Mounted — 800 Active Camera Feeds Ingested]
        </div>
      </div>

      {/* Overlay HUD displaying active polygons */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {activeZonePolygons.map((poly) => {
          const isSelected = poly.zoneId === selectedZoneId;
          const polyColor = getPolygonColor(poly.currentDensityPerSqM);

          return (
            <button
              key={poly.zoneId}
              onClick={() => onSelectZonePolygon(poly.zoneId)}
              style={{
                backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.25)' : 'rgba(22, 27, 34, 0.85)',
                border: `1.5px solid ${polyColor}`,
                padding: '12px 16px',
                borderRadius: '12px',
                color: '#F0F6FC',
                textAlign: 'left',
                cursor: 'pointer',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700 }}>{poly.zoneId}</div>
              <div style={{ fontSize: '12px', color: polyColor, fontWeight: 600 }}>
                Density: {poly.currentDensityPerSqM} p/m²
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```
