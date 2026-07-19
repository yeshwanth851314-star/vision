import React from "react";
import { Stack } from "expo-router";
import { VISIONOS_COLORS } from "@visionos/shared";

export default function MobileRootLayout() {
  const ExpoStack = Stack as any;
  return (
    <ExpoStack
      screenOptions={{
        headerStyle: { backgroundColor: VISIONOS_COLORS.LPU_MAROON },
        headerTintColor: VISIONOS_COLORS.TEXT_PRIMARY,
        headerTitleStyle: { fontWeight: "800", color: VISIONOS_COLORS.LPU_GOLD },
        contentStyle: { backgroundColor: VISIONOS_COLORS.BACKGROUND_DARK },
      }}
    >
      <ExpoStack.Screen name="index" options={{ title: "VisionOS Stadium App" }} />
    </ExpoStack>
  );
}
