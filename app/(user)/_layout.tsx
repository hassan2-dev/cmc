import { Tabs, Redirect } from "expo-router";
import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";

const UserLayout = () => {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          // Default icon in case something goes wrong
          return <Ionicons name="help-outline" size={size} color={color} />;
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          href: null, // Hide this tab
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "الإعدادات",
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            return (
              <Ionicons
                name={focused ? "settings" : "settings-outline"}
                size={size}
                color={color}
              />
            );
          },
          tabBarLabelStyle: {
            fontFamily: "System",
            fontSize: 12,
          },
        }}
      />

      <Tabs.Screen
        name="visits"
        options={{
          title: "الزيارات",
          headerShown: false,
          href: null,
        }}
      />
      <Tabs.Screen
        name="tours"
        options={{
          title: "الجولات",
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            return (
              <Ionicons
                name={focused ? "map" : "map-outline"}
                size={size}
                color={color}
              />
            );
          },
          tabBarLabelStyle: {
            fontFamily: "System",
            fontSize: 12,
          },
        }}
      />

      <Tabs.Screen
        name="visits/[id]"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="visits/edit/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
};

export default UserLayout;
