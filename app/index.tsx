import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useRouter } from "expo-router";
import useUserStore from "@/store";
import { Ionicons } from "@expo/vector-icons";

type LoginT = {
  email: string;
  password: string;
};

// Login API function
const loginUser = async (credentials: LoginT) => {
  const { data } = await axiosInstance.post("/api/login", credentials);
  console.log(data);
  return data;
};

const Login = () => {
  const router = useRouter();
  const user = useUserStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Check for existing token on mount
  useEffect(() => {
    checkExistingToken();
  }, []);

  const checkExistingToken = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userData = await AsyncStorage.getItem("userData");

      if (token && userData) {
        // Set token in axios headers
        axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${token}`;

        // Parse and set user data
        const parsedUserData = JSON.parse(userData);
        user.setUser(parsedUserData);

        // Navigate to home
        router.replace("/(user)/tours" as any);
      }
    } catch (error) {
      console.error("Auto-login error:", error);
      await AsyncStorage.multiRemove(["token", "userData"]);
      delete axiosInstance.defaults.headers.common["Authorization"];
    } finally {
      setIsLoading(false);
    }
  };

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: async (data) => {
      try {
        const token = data.data.authorization.token;
        const userData = {
          id: data.data.user.id,
          name: data.data.user.name,
          email: data.data.user.email,
        };

        // First update axios headers
        axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${token}`;

        // Then store data
        await Promise.all([
          AsyncStorage.setItem("token", token),
          AsyncStorage.setItem("userData", JSON.stringify(userData)),
        ]);

        // Update user store
        user.setUser(userData);

        // Navigate to home
        router.replace("/(user)/tours" as any);
      } catch (error) {
        console.error("Error saving auth data:", error);
        Alert.alert("خطأ", "حدث خطأ أثناء حفظ بيانات تسجيل الدخول");
      }
    },
    onError: (error) => {
      console.error("Login error:", error);
      Alert.alert("خطأ", "فشل تسجيل الدخول");
    },
  });

  // Show loading screen while checking token
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // التحقق من صحة البريد الإلكتروني
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("البريد الإلكتروني مطلوب");
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError("البريد الإلكتروني غير صالح");
      return false;
    }
    setEmailError("");
    return true;
  };

  // التحقق من كلمة المرور
  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError("كلمة المرور مطلوبة");
      return false;
    }
    if (password.length < 6) {
      setPasswordError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleLogin = async () => {
    try {
      const isEmailValid = validateEmail(email);
      const isPasswordValid = validatePassword(password);

      if (!isEmailValid || !isPasswordValid) {
        return;
      }

      loginMutation.mutate({ email, password });
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("خطأ", "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logo}
            />
            <Text style={styles.title}>CMC - تسجيل الدخول</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>البريد الإلكتروني</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.rtlText,
                  emailError && styles.inputError
                ]}
                placeholder="أدخل بريدك الإلكتروني"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  validateEmail(text);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loginMutation.isPending}
                textAlign="right"
              />
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>كلمة المرور</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.rtlText,
                    styles.passwordInput,
                    passwordError && styles.inputError
                  ]}
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    validatePassword(text);
                  }}
                  secureTextEntry={!showPassword}
                  editable={!loginMutation.isPending}
                  textAlign="right"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.loginButton,
                loginMutation.isPending && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loginMutation.isPending}
            >
              <View style={styles.loginButtonContent}>
                {loginMutation.isPending ? (
                  <>
                    <ActivityIndicator color="#fff" style={styles.loadingSpinner} />
                    <Text style={styles.loginButtonText}>جاري تسجيل الدخول...</Text>
                  </>
                ) : (
                  <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  logoContainer: {
    alignItems: "center",
    marginTop: Platform.OS === "ios" ? 60 : 40,
    marginBottom: 40,
  },
  logo: {
    width: 200,
    height: 200,
    borderRadius: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    color: "#333",
  },
  formContainer: {
    paddingHorizontal: 20,
    direction: "rtl",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    color: "#555555",
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#F8F8F8",
    color: "#333333",
    marginBottom: 4,
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  inputError: {
    borderColor: "#ff3b30",
    backgroundColor: "#FFF5F5",
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 12,
    marginTop: 2,
    textAlign: "right",
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 54,
    marginTop: 10,
  },
  loginButtonDisabled: {
    backgroundColor: "#007AFF",
    opacity: 0.8,
  },
  loginButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  signupText: {
    color: "#333",
    fontSize: 14,
  },
  signupLink: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  passwordContainer: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  passwordToggle: {
    position: "absolute",
    left: 10,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingSpinner: {
    marginRight: 10,
    transform: [{ scale: 0.8 }]
  },
});

export default Login;
