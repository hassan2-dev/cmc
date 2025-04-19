"use client";

import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import axiosInstance from "@/lib/axiosInstance";
import NetInfo from "@react-native-community/netinfo";

interface UserData {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  employee: {
    id: number;
    user_id: number;
    city_id: number;
    admin_id: number;
    admin: {
      id: number;
      user_id: number;
      city_id: number;
      is_super: number;
      user: {
        id: number;
        name: string;
        email: string;
        email_verified_at: string | null;
      };
    };
  };
}

interface ApiResponse {
  success: boolean;
  data: UserData;
  message?: string;
}

const Settings = () => {
  const [isArabic, setIsArabic] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [offlineData, setOfflineData] = useState<UserData | null>(null);
  const [isOfflineData, setIsOfflineData] = useState(false);

  // Function to get offline data
  const getOfflineData = async () => {
    try {
      const cachedData = await AsyncStorage.getItem('userProfileData');
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        return {
          name: parsedData.name,
          email: parsedData.email,
          employee: {
            admin: {
              user: {
                name: parsedData.supervisorName
              }
            }
          }
        } as UserData;
      }
    } catch (error) {
      console.error("Error reading from storage:", error);
      return null;
    }
  };

  const checkServerAvailability = async () => {
    try {
      // استخدام نفس نقطة النهاية مع timeout
      const response = await Promise.race([
        axiosInstance.get('/api/employee-profile'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        )
      ]);
      return true;
    } catch (error) {
      console.log("Server check failed:", error);
      return false;
    }
  };

  // Fetch user profile data
  const { data: userData, isLoading, refetch } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      // التحقق من حالة الاتصال بالإنترنت
      const networkState = await NetInfo.fetch();

      if (!networkState.isConnected) {
        const offlineData = await getOfflineData();
        if (offlineData) {
          return offlineData;
        }
        throw new Error("لا يوجد اتصال بالإنترنت ولا توجد بيانات مخزنة");
      }

      try {
        // التحقق من توفر السيرفر وجلب البيانات في نفس الوقت
        const response = await Promise.race([
          axiosInstance.get<ApiResponse>("/api/employee-profile"),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Server timeout')), 5000)
          )
        ]);

        if (!response.data) {
          throw new Error(response?.data?.message || "Failed to fetch profile data");
        }

        // تخزين البيانات في AsyncStorage
        const userDataToStore = {
          name: response.data.data.name,
          email: response.data.data.email,
          supervisorName: response.data.data.employee?.admin?.user?.name
        };

        await AsyncStorage.setItem('userProfileData', JSON.stringify(userDataToStore));
        return response.data.data;

      } catch (error) {
        console.error("Error fetching profile:", error);
        
        // محاولة استخدام البيانات المخزنة في حالة فشل الاتصال
        const offlineData = await getOfflineData();
        if (offlineData) {
          return offlineData;
        }

        throw error instanceof Error
          ? error
          : new Error("فشل الاتصال بالسيرفر ولا توجد بيانات مخزنة");
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Password change mutation
  const passwordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      try {
        const response = await axiosInstance.post(
          "/api/employee-profile/reset-password",
          {
            current_password: data.currentPassword,
            new_password: data.newPassword,
            new_password_confirmation: data.confirmPassword,
          }
        );
        return response.data;
      } catch (error: any) {
        if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        } else if (error.response?.data?.errors) {
          const errorMessages = Object.values(
            error.response.data.errors
          ).flat();
          throw new Error(errorMessages.join("\n"));
        } else {
          throw new Error("حدث خطأ أثناء تغيير كلمة المرور");
        }
      }
    },
    onSuccess: (data) => {
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      Alert.alert("نجاح", "تم تغيير كلمة المرور بنجاح");
    },
    onError: (error: Error) => {
      Alert.alert("خطأ", error.message || "فشل تغيير كلمة المرور");
    },
  });

  // Add validation before submitting
  const handlePasswordChange = async () => {
    // Check network connectivity first
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      Alert.alert("خطأ", "أنت غير متصل بالإنترنت. يرجى التحقق من اتصالك والمحاولة مرة أخرى.");
      return;
    }

    // Validate inputs
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      Alert.alert("خطأ", "يرجى ملء جميع الحقول");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert("خطأ", "كلمة المرور الجديدة وتأكيدها غير متطابقين");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      Alert.alert("خطأ", "يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل");
      return;
    }

    // Submit if validation passes
    passwordMutation.mutate(passwordData);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(["token", "userData"]);
      delete axiosInstance.defaults.headers.common["Authorization"];
      router.replace("/");
    } catch (error) {
      console.error("فشل تسجيل الخروج:", error);
      Alert.alert(
        "فشل تسجيل الخروج",
        "فشل تسجيل الخروج. يرجى المحاولة مرة أخرى."
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>جارِ التحميل...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الإعدادات</Text>
        {isOfflineData && (
          <View style={styles.offlineIndicator}>
            <Ionicons name="cloud-offline-outline" size={16} color="#666" />
            <Text style={styles.offlineText}>البيانات من التخزين المحلي</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.container}>
        {/* User Profile Section */}
        <View style={styles.profileContainer}>
          <View style={styles.userAvatarContainer}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitials}>
                {userData?.name ? userData.name.charAt(0).toUpperCase() : ""}
              </Text>
            </View>
          </View>
          <View style={styles.userInfoContainer}>
            <Text style={styles.userName}>{userData?.name}</Text>
            <Text style={styles.userEmail}>{userData?.email}</Text>
            <View style={styles.userDetailsGrid}>
              <View style={styles.detailItem}>
                <Ionicons name="person-outline" size={18} color="#666" />
                <Text style={styles.detailLabel}>المشرف</Text>
                <Text style={styles.detailValue}>
                  {userData?.employee?.admin?.user?.name}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Settings Options */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>خيارات الحساب</Text>
          
          {/* Password Change Section */}
          <TouchableOpacity
            onPress={() => setIsChangingPassword(!isChangingPassword)}
            style={[styles.settingItem]}
          >
            <View style={styles.settingItemContent}>
              <Ionicons name="key-outline" size={20} color="#64748b" />
              <Text style={styles.settingItemText}>
                {isChangingPassword ? "إلغاء" : "تغيير كلمة المرور"}
              </Text>
            </View>
            <Ionicons
              name={isChangingPassword ? "chevron-up" : "chevron-forward"}
              size={18}
              color="#64748b"
            />
          </TouchableOpacity>

          {isChangingPassword && (
            <View style={styles.passwordInputSection}>
              <TextInput
                secureTextEntry
                placeholder="كلمة المرور الحالية"
                placeholderTextColor="#666"
                value={passwordData.currentPassword}
                onChangeText={(text) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    currentPassword: text,
                  }))
                }
                style={styles.passwordInput}
              />
              <TextInput
                secureTextEntry
                placeholder="كلمة المرور الجديدة"
                placeholderTextColor="#666"
                value={passwordData.newPassword}
                onChangeText={(text) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    newPassword: text,
                  }))
                }
                style={styles.passwordInput}
              />
              <TextInput
                secureTextEntry
                placeholder="تأكيد كلمة المرور الجديدة"
                placeholderTextColor="#666"
                value={passwordData.confirmPassword}
                onChangeText={(text) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    confirmPassword: text,
                  }))
                }
                style={styles.passwordInput}
              />
              <TouchableOpacity
                onPress={handlePasswordChange}
                disabled={passwordMutation.isPending}
                style={[
                  styles.saveButton,
                  {
                    opacity: passwordMutation.isPending ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={styles.saveButtonText}>
                  {passwordMutation.isPending
                    ? "جارِ الحفظ..."
                    : "حفظ كلمة المرور"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Logout Button */}
          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <View style={styles.settingItemContent}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.logoutText}>تسجيل الخروج</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {isOfflineData && (
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => refetch()}
          >
            <Ionicons name="refresh-outline" size={16} color="#3b82f6" />
            <Text style={styles.refreshText}>تحديث البيانات</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#fff",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    alignItems: "center",
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  profileContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginVertical: 16,
  },
  userAvatarContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },
  userInitials: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
  },
  userInfoContainer: {
    alignItems: "center",
    gap: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
  },
  userEmail: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
  },
  userDetailsGrid: {
    width: "100%",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  detailLabel: {
    marginLeft: 12,
    color: "#64748b",
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  detailValue: {
    fontWeight: "600",
    color: "#1e293b",
    fontSize: 16,
  },
  settingsSection: {
    marginBottom: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  passwordInputSection: {
    padding: 16,
    gap: 12,
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  passwordInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    color: "#1e293b",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  settingItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#334155",
  },
  saveButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#3b82f6",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "500",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  offlineText: {
    color: '#856404',
    fontSize: 12,
    marginLeft: 4,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  refreshText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default Settings;
