import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  BackHandler,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SignatureScreen from "react-native-signature-canvas";
import { Svg, Path } from "react-native-svg";
import { PanResponder, Animated } from "react-native";
import {
  saveVisit,
  debugDatabase,
  saveImageToFileSystem,
} from "@/lib/database";
import * as ImagePicker from "expo-image-picker";
import { Picker } from '@react-native-picker/picker';

type ServiceType =
  | "بيع وتداول"
  | "استخدام LMR"
  | "استخدام MW"
  | "استخدام VSAT"
  | "استخدام LTE"
  | "استخدام GMPCS"
  | "استخدام GPS"
  | "استخدام FM"
  | "أخرى";

type EntityType = "حكومية" | "قطاع خاص";

type SystemType = "ثابتة" | "متحركة";

// Add new type for image with title
type ImageWithTitle = {
  title: string;
  image: string;
};

type VisitFormData = {
  entityName: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  serviceType: ServiceType;
  systemType: SystemType;
  deviceType: string;
  deviceModel: string;
  serialNumber: string;
  antennaType: string;
  procedures: string;
  entityType: EntityType;
  visitTime: string;
  clientSignature: string;
  employeeSignature: string;
  securitySignature: string;
  antennaCount: string;
  antennaHeight: string;
  antennaDiameter: string;
  coverageRange: string;
  usedFrequencies: string;
  frequencyLicense: string;
  bandwidth: string;
  polarity: string;
  externalPower: string;
  status: string;
  images: ImageWithTitle[];  // Changed back to ImageWithTitle[]
  id_images: string[];
  imei: string;
  providerCompany: string;
  number: string;
};

// Define the Visit type
type Visit = {
  id: number;
  entityName: string;
  address: string;
  notes: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  status: "pending" | "completed";
  created_at: string;
  visitTime: string;
  images: string[];
  deviceType: string;
  deviceModel: string;
  serial_number: string;
};

const ReviewModal = ({
  visible,
  formData,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  formData: VisitFormData;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={[styles.modalOverlay]}>
      <View style={[styles.reviewModal, { direction: "rtl" }]}>
        <Text style={styles.reviewTitle}>مراجعة الزيارة</Text>

        <ScrollView style={styles.reviewContent}>
          <ReviewItem label="اسم الجهة" value={formData.entityName} />
          <ReviewItem label="الحالة" value={formData.status} />
          <ReviewItem label="نوع الخدمة" value={formData.serviceType} />
          <ReviewItem
            label="الموقع"
            value={`${formData.coordinates.latitude}, ${formData.coordinates.longitude}`}
          />
          <ReviewItem label="نوع الجهاز" value={formData.deviceType} />
          <ReviewItem label="رقم IMEI" value={formData.imei} />
          <ReviewItem label="اسم شركة المجهزة" value={formData.providerCompany} />
          <ReviewItem label="العدد" value={formData.number} />
          <ReviewItem label="الموديل" value={formData.deviceModel} />
          <ReviewItem label="الرقم التسلسلي" value={formData.serialNumber} />
          <ReviewItem label="القدرة الخارجية" value={formData.externalPower} />
          <ReviewItem label="عدد الهوائيات" value={formData.antennaCount} />
          <ReviewItem label="ارتفاع الهوائي" value={formData.antennaHeight} />
          <ReviewItem label="قطر الهوائي" value={formData.antennaDiameter} />
          <ReviewItem label="نطاق التغطية" value={formData.coverageRange} />
          <ReviewItem
            label="الترددات المستخدمة"
            value={formData.usedFrequencies}
          />
          <ReviewItem label="رخصة التردد" value={formData.frequencyLicense} />
          <ReviewItem label="عرض النطاق" value={formData.bandwidth} />
          <ReviewItem label="الاستقطاب" value={formData.polarity} />
          <ReviewItem label="الإجراءات" value={formData.procedures} />
          <ReviewItem
            label="التوقيعات"
            value={`العميل: ${formData.clientSignature ? "✓" : "✗"}, الموظف: ${formData.employeeSignature ? "✓" : "✗"
              }, المسؤول: ${formData.securitySignature ? "✓" : "✗"}`}
          />
          <ReviewItem
            label="الصور"
            value={`${formData.images.length} صور مرفقة`}
          />
        </ScrollView>

        <View style={styles.reviewButtons}>
          <TouchableOpacity
            style={[styles.reviewButton, styles.confirmButton]}
            onPress={onConfirm}
          >
            <Text style={styles.reviewButtonText}>تأكيد وحفظ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reviewButton, styles.cancelButton]}
            onPress={onCancel}
          >
            <Text style={styles.reviewButtonText}>تعديل</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);
const ReviewItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.reviewItem}>
    <Text style={styles.reviewLabel}>{label}:</Text>
    <Text style={styles.reviewValue}>{value}</Text>
  </View>
);
const AddVisit = () => {
  const { id: tourId } = useLocalSearchParams();
  // Validate tourId early
  if (!tourId) {
    console.error("No tour ID provided");
    Alert.alert("خطأ", "لم يتم العثور على معرف الجولة");
    return null;
  }
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState<VisitFormData>({
    entityName: "",
    address: "",
    coordinates: {
      latitude: 30.5095,
      longitude: 47.7834,
    },
    serviceType: "بيع وتداول",
    systemType: "ثابتة",
    deviceType: "",
    deviceModel: "",
    serialNumber: "",
    antennaType: "",
    procedures: "",
    entityType: "حكومية",
    visitTime: new Date().toISOString(),
    clientSignature: "",
    employeeSignature: "",
    securitySignature: "",
    antennaCount: "",
    antennaHeight: "",
    antennaDiameter: "",
    coverageRange: "",
    usedFrequencies: "",
    frequencyLicense: "",
    bandwidth: "",
    polarity: "",
    externalPower: "",
    status: "",
    images: [],
    id_images: [],
    imei: "",
    providerCompany: "",
    number: "",
  });

  // Add this state for map modal
  const [isMapVisible, setIsMapVisible] = useState(false);

  // Add these new state variables inside AddVisit component
  const [currentSignature, setCurrentSignature] = useState<
    "client" | "employee" | "security" | null
  >(null);
  const [paths, setPaths] = useState<{
    client: string[];
    employee: string[];
    security: string[];
  }>({
    client: [],
    employee: [],
    security: [],
  });
  const [currentPath, setCurrentPath] = useState<string>("");
  const [isSignatureModalVisible, setIsSignatureModalVisible] = useState(false);
  const [showReview, setShowReview] = useState(false);

  // Add new state for full screen map
  const [isFullScreenMap, setIsFullScreenMap] = useState(false);

  // Initialize form data and signatures from local storage
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        // Load all saved data in parallel
        const [
          savedStep,
          savedEntityName,
          savedCoordinates,
          savedDeviceType,
          savedDeviceModel,
          savedSerialNumber,
          savedAntennaCount,
          savedAntennaHeight,
          savedAntennaDiameter,
          savedProcedures,
          savedClientSignature,
          savedEmployeeSignature,
          savedSecuritySignature,
          savedStatus,
          savedEntityType,
          savedSystemType,
          savedIMEI,
          savedProviderCompany,
          savedNumber,
        ] = await Promise.all([
          AsyncStorage.getItem(`visit_step_${tourId}`),
          AsyncStorage.getItem(`visit_entity_name_${tourId}`),
          AsyncStorage.getItem(`visit_coordinates_${tourId}`),
          AsyncStorage.getItem(`visit_device_type_${tourId}`),
          AsyncStorage.getItem(`visit_device_model_${tourId}`),
          AsyncStorage.getItem(`visit_serial_number_${tourId}`),
          AsyncStorage.getItem(`visit_antenna_count_${tourId}`),
          AsyncStorage.getItem(`visit_antenna_height_${tourId}`),
          AsyncStorage.getItem(`visit_antenna_diameter_${tourId}`),
          AsyncStorage.getItem(`visit_procedures_${tourId}`),
          AsyncStorage.getItem(`visit_client_signature_${tourId}`),
          AsyncStorage.getItem(`visit_employee_signature_${tourId}`),
          AsyncStorage.getItem(`visit_security_signature_${tourId}`),
          AsyncStorage.getItem(`visit_status_${tourId}`),
          AsyncStorage.getItem(`visit_entity_type_${tourId}`),
          AsyncStorage.getItem(`visit_system_type_${tourId}`),
          AsyncStorage.getItem(`visit_imei_${tourId}`),
          AsyncStorage.getItem(`visit_provider_company_${tourId}`),
          AsyncStorage.getItem(`visit_number_${tourId}`),
        ]);

        // Create new form data object with saved values
        const coordinates = savedCoordinates
          ? JSON.parse(savedCoordinates)
          : formData.coordinates;
        const newFormData: VisitFormData = {
          entityName: savedEntityName || formData.entityName,
          address: formData.address,
          coordinates,
          serviceType: formData.serviceType,
          systemType: (savedSystemType as SystemType) || formData.systemType,
          deviceType: savedDeviceType || formData.deviceType,
          deviceModel: savedDeviceModel || formData.deviceModel,
          serialNumber: savedSerialNumber || formData.serialNumber,
          antennaType: formData.antennaType,
          antennaCount: savedAntennaCount || formData.antennaCount,
          antennaHeight: savedAntennaHeight || formData.antennaHeight,
          antennaDiameter: savedAntennaDiameter || formData.antennaDiameter,
          procedures: savedProcedures || formData.procedures,
          visitTime: formData.visitTime,
          clientSignature: savedClientSignature || formData.clientSignature,
          employeeSignature: savedEmployeeSignature || formData.employeeSignature,
          securitySignature: savedSecuritySignature || formData.securitySignature,
          coverageRange: formData.coverageRange,
          usedFrequencies: formData.usedFrequencies,
          frequencyLicense: formData.frequencyLicense,
          bandwidth: formData.bandwidth,
          polarity: formData.polarity,
          externalPower: formData.externalPower,
          status: savedStatus || formData.status,
          images: formData.images,
          id_images: formData.id_images,
          entityType: savedEntityType as EntityType || formData.entityType,
          imei: savedIMEI || formData.imei,
          providerCompany: savedProviderCompany || formData.providerCompany,
          number: savedNumber || formData.number,
        };

        setFormData(newFormData);

        if (savedStep) {
          const step = parseInt(savedStep);
          setCurrentStep(step);
        }
      } catch (error) {
        console.error("Error loading saved data:", error);
      }
    };

    loadSavedData();
  }, [tourId]);

  // Update the useEffect that saves data to save immediately when form data changes
  useEffect(() => {
    const saveData = async () => {
      try {
        // Save all form data fields individually for better performance
        const savePromises = [
          AsyncStorage.setItem(`visit_step_${tourId}`, currentStep.toString()),
          AsyncStorage.setItem(
            `visit_entity_name_${tourId}`,
            formData.entityName
          ),
          AsyncStorage.setItem(
            `visit_coordinates_${tourId}`,
            JSON.stringify(formData.coordinates)
          ),
          AsyncStorage.setItem(
            `visit_device_type_${tourId}`,
            formData.deviceType
          ),
          AsyncStorage.setItem(
            `visit_device_model_${tourId}`,
            formData.deviceModel
          ),
          AsyncStorage.setItem(
            `visit_serial_number_${tourId}`,
            formData.serialNumber
          ),
          AsyncStorage.setItem(
            `visit_antenna_count_${tourId}`,
            formData.antennaCount
          ),
          AsyncStorage.setItem(
            `visit_antenna_height_${tourId}`,
            formData.antennaHeight
          ),
          AsyncStorage.setItem(
            `visit_antenna_diameter_${tourId}`,
            formData.antennaDiameter
          ),
          AsyncStorage.setItem(
            `visit_procedures_${tourId}`,
            formData.procedures
          ),
          AsyncStorage.setItem(`visit_status_${tourId}`, formData.status),
          AsyncStorage.setItem(`visit_imei_${tourId}`, formData.imei),
          AsyncStorage.setItem(`visit_provider_company_${tourId}`, formData.providerCompany),
          AsyncStorage.setItem(`visit_number_${tourId}`, formData.number),
        ];

        // Save signatures separately due to their size
        if (formData.clientSignature) {
          savePromises.push(
            AsyncStorage.setItem(
              `visit_client_signature_${tourId}`,
              formData.clientSignature
            )
          );
        }
        if (formData.employeeSignature) {
          savePromises.push(
            AsyncStorage.setItem(
              `visit_employee_signature_${tourId}`,
              formData.employeeSignature
            )
          );
        }
        if (formData.securitySignature) {
          savePromises.push(
            AsyncStorage.setItem(
              `visit_security_signature_${tourId}`,
              formData.securitySignature
            )
          );
        }

        await Promise.all(savePromises);
      } catch (error) {
        console.error("Error saving form data:", error);
      }
    };

    saveData();
  }, [formData, currentStep, tourId]);

  // Clear saved data after successful submission
  const clearSavedData = async () => {
    try {
      const keysToRemove = [
        `visit_step_${tourId}`,
        `visit_entity_name_${tourId}`,
        `visit_coordinates_${tourId}`,
        `visit_device_type_${tourId}`,
        `visit_device_model_${tourId}`,
        `visit_serial_number_${tourId}`,
        `visit_antenna_count_${tourId}`,
        `visit_antenna_height_${tourId}`,
        `visit_antenna_diameter_${tourId}`,
        `visit_procedures_${tourId}`,
        `visit_client_signature_${tourId}`,
        `visit_employee_signature_${tourId}`,
        `visit_security_signature_${tourId}`,
        `visit_status_${tourId}`,
        `visit_service_type_${tourId}`,
        `visit_coverage_range_${tourId}`,
        `visit_used_frequencies_${tourId}`,
        `visit_frequency_license_${tourId}`,
        `visit_bandwidth_${tourId}`,
        `visit_polarity_${tourId}`,
        `visit_external_power_${tourId}`,
        `visit_system_type_${tourId}`,
        `visit_imei_${tourId}`,
        `visit_provider_company_${tourId}`,
        `visit_number_${tourId}`,
      ];

      await Promise.all(
        keysToRemove.map((key) => AsyncStorage.removeItem(key))
      );
    } catch (error) {
      console.error("Error clearing saved data:", error);
    }
  };

  const addVisitMutation = useMutation({
    mutationFn: async (visitData: VisitFormData) => {
      try {
        const visit = {
          tour_id: tourId as string,
          name: visitData.entityName,
          lat: visitData.coordinates.latitude.toString(),
          lng: visitData.coordinates.longitude.toString(),
          note: visitData.procedures,
          address: `${visitData.coordinates.latitude}, ${visitData.coordinates.longitude}`,
          service_type: visitData.serviceType || "",
          device_type: visitData.deviceType,
          device_model: visitData.deviceModel,
          serial_number: visitData.serialNumber,
          antenna_type: visitData.antennaType || "",
          antenna_count: visitData.antennaCount,
          antenna_height: visitData.antennaHeight,
          antenna_diameter: visitData.antennaDiameter,
          coverage_range: visitData.coverageRange || "",
          used_frequencies: visitData.usedFrequencies || "",
          frequency_license: visitData.frequencyLicense || "",
          bandwidth: visitData.bandwidth || "",
          polarity: visitData.polarity || "",
          external_power: visitData.externalPower || "",
          status: visitData.status || "completed",
          created_at: new Date().toISOString(),
          client_signature: visitData.clientSignature,
          employee_signature: visitData.employeeSignature,
          security_signature: visitData.securitySignature,
          synced: false,
          image: visitData.images[0]?.image || "",
          images: visitData.images.map(image => image.image),
          id_image: visitData.id_images[0] || "",
          id_images: visitData.id_images,
          entity_type: visitData.entityType,
          imei: visitData.imei || "",
          provider_company: visitData.providerCompany || "",
          number: visitData.number || "",
        };

        const result = await saveVisit(visit);
        return result;
      } catch (error) {
        console.error("=== Mutation Error ===");
        console.error("Error saving visit:", error);
        if (error instanceof Error) {
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      router.back();
    },
    onError: (error) => {
      console.error("=== Mutation Error Handler ===");
      console.error("Error in mutation:", error);
      Alert.alert("خطأ", "حدث خطأ أثناء حفظ الزيارة");
    },
  });

  const handleSubmit = () => {
    formData.images.forEach((image, index) => { });

    // Validate fields first
    const requiredFields = [
      { field: formData.entityName, name: "اسم الجهة" },
      { field: formData.coordinates?.latitude, name: "خط العرض" },
      { field: formData.coordinates?.longitude, name: "خط الطول" },
    ];

    const missingFields = requiredFields
      .filter(({ field }) => {
        if (typeof field === "number") {
          return false; // Consider 0 as valid
        }
        return !field || (typeof field === "string" && !field.trim());
      })
      .map(({ name }) => name);

    if (missingFields.length > 0) {
      Alert.alert(
        "معلومات ناقصة",
        `يرجى إكمال الحقول التالية:\n${missingFields.join("\n")}`,
        [{ text: "حسناً", style: "default" }]
      );
      return;
    }

    // Show review modal instead of immediate submission
    setShowReview(true);
  };

  const handleConfirmSubmit = () => {
    setShowReview(false);
    addVisitMutation.mutate(formData);
  };

  const params = useLocalSearchParams();

  useFocusEffect(
    React.useCallback(() => {
      const restoreFormData = async () => {
        try {
          // Load all saved data in parallel
          const [
            savedStep,
            savedEntityName,
            savedCoordinates,
            savedDeviceType,
            savedDeviceModel,
            savedSerialNumber,
            savedAntennaCount,
            savedAntennaHeight,
            savedAntennaDiameter,
            savedProcedures,
            savedClientSignature,
            savedEmployeeSignature,
            savedSecuritySignature,
            savedStatus,
            savedEntityType,
            savedSystemType,
            savedIMEI,
            savedProviderCompany,
            savedNumber,
          ] = await Promise.all([
            AsyncStorage.getItem(`visit_step_${tourId}`),
            AsyncStorage.getItem(`visit_entity_name_${tourId}`),
            AsyncStorage.getItem(`visit_coordinates_${tourId}`),
            AsyncStorage.getItem(`visit_device_type_${tourId}`),
            AsyncStorage.getItem(`visit_device_model_${tourId}`),
            AsyncStorage.getItem(`visit_serial_number_${tourId}`),
            AsyncStorage.getItem(`visit_antenna_count_${tourId}`),
            AsyncStorage.getItem(`visit_antenna_height_${tourId}`),
            AsyncStorage.getItem(`visit_antenna_diameter_${tourId}`),
            AsyncStorage.getItem(`visit_procedures_${tourId}`),
            AsyncStorage.getItem(`visit_client_signature_${tourId}`),
            AsyncStorage.getItem(`visit_employee_signature_${tourId}`),
            AsyncStorage.getItem(`visit_security_signature_${tourId}`),
            AsyncStorage.getItem(`visit_status_${tourId}`),
            AsyncStorage.getItem(`visit_entity_type_${tourId}`),
            AsyncStorage.getItem(`visit_system_type_${tourId}`),
            AsyncStorage.getItem(`visit_imei_${tourId}`),
            AsyncStorage.getItem(`visit_provider_company_${tourId}`),
            AsyncStorage.getItem(`visit_number_${tourId}`),
          ]);

          // Only update coordinates if they're provided in params
          let coordinates = formData.coordinates;
          if (params?.latitude && params?.longitude) {
            coordinates = {
              latitude: Number(params.latitude),
              longitude: Number(params.longitude),
            };
          } else if (savedCoordinates) {
            coordinates = JSON.parse(savedCoordinates);
          }

          // Merge existing data with saved data
          const newFormData: VisitFormData = {
            entityName: savedEntityName || formData.entityName,
            address: formData.address,
            coordinates,
            serviceType: formData.serviceType,
            systemType: (savedSystemType as SystemType) || formData.systemType,
            deviceType: savedDeviceType || formData.deviceType,
            deviceModel: savedDeviceModel || formData.deviceModel,
            serialNumber: savedSerialNumber || formData.serialNumber,
            antennaType: formData.antennaType,
            antennaCount: savedAntennaCount || formData.antennaCount,
            antennaHeight: savedAntennaHeight || formData.antennaHeight,
            antennaDiameter: savedAntennaDiameter || formData.antennaDiameter,
            procedures: savedProcedures || formData.procedures,
            visitTime: formData.visitTime,
            clientSignature: savedClientSignature || formData.clientSignature,
            employeeSignature: savedEmployeeSignature || formData.employeeSignature,
            securitySignature: savedSecuritySignature || formData.securitySignature,
            coverageRange: formData.coverageRange,
            usedFrequencies: formData.usedFrequencies,
            frequencyLicense: formData.frequencyLicense,
            bandwidth: formData.bandwidth,
            polarity: formData.polarity,
            externalPower: formData.externalPower,
            status: savedStatus || formData.status,
            images: formData.images,
            id_images: formData.id_images,
            entityType: savedEntityType as EntityType || formData.entityType,
            imei: savedIMEI || formData.imei,
            providerCompany: savedProviderCompany || formData.providerCompany,
            number: savedNumber || formData.number,
          };

          setFormData(newFormData);

          if (savedStep) {
            const step = parseInt(savedStep);
            setCurrentStep(step);
          }
        } catch (error) {
          console.error("Error restoring form data:", error);
        }
      };

      restoreFormData();
    }, [params?.latitude, params?.longitude, tourId])
  );

  // Add debug logging for signatures
  useEffect(() => {
    console.log("Form Data Updated:", {
      clientSignature: formData.clientSignature ? "Present" : "Not present",
      employeeSignature: formData.employeeSignature ? "Present" : "Not present",
    });
  }, [formData.clientSignature, formData.employeeSignature]);

  // Replace handleMapPress with this
  const handleMapPress = () => {
    setIsMapVisible(true);
  };

  // Add this function to handle map selection
  const handleLocationSelect = (coordinate: {
    latitude: number;
    longitude: number;
  }) => {
    setFormData((prev) => ({
      ...prev,
      coordinates: coordinate,
    }));
    setIsMapVisible(false);
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("خطأ", "نحتاج إلى إذن للوصول إلى الموقع");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setFormData((prev) => ({
        ...prev,
        coordinates: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      }));
    } catch (error) {
      console.error("Location Error Details:", error);
      Alert.alert("خطأ", "حدث خطأ أثناء تحديد الموقع");
    }
  };

  const createPanResponder = () => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        setCurrentPath(`M ${locationX} ${locationY}`);
      },
      onPanResponderMove: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        setCurrentPath((prev) => `${prev} L ${locationX} ${locationY}`);
      },
      onPanResponderRelease: () => {
        if (currentSignature && currentPath) {
          setPaths((prev) => ({
            ...prev,
            [currentSignature]: [...prev[currentSignature], currentPath],
          }));
          setCurrentPath("");
        }
      },
    });
  };

  const panResponder = createPanResponder();

  const handleOpenSignature = (type: "client" | "employee" | "security") => {
    setCurrentSignature(type);
    setIsSignatureModalVisible(true);
  };

  const handleClearSignature = () => {
    if (currentSignature) {
      setPaths((prev) => ({
        ...prev,
        [currentSignature]: [],
      }));
    }
  };

  const handleSaveSignature = async () => {
    if (!currentSignature) return;

    try {
      // Create SVG string from paths
      const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
          ${paths[currentSignature]
          .map(
            (path) =>
              `<path d="${path}" stroke="black" fill="none" stroke-width="2" />`
          )
          .join("")}
        </svg>
      `;

      // Convert to base64
      const signatureData = `data:image/svg+xml;base64,${btoa(svgString)}`;

      // Update form data
      setFormData((prev) => ({
        ...prev,
        [`${currentSignature}Signature`]: signatureData,
      }));

      // Save to AsyncStorage
      await AsyncStorage.setItem(
        `visit_${currentSignature}_signature_${tourId}`,
        signatureData
      );

      setIsSignatureModalVisible(false);
      setCurrentSignature(null);
    } catch (error) {
      console.error("Error saving signature:", error);
      Alert.alert("خطأ", "حدث خطأ أثناء حفظ التوقيع");
    }
  };

  const pickImage = async () => {
    try {
      console.log("Starting image picker...");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        console.log("Images picked successfully");

        // Process all selected images
        const newImages: ImageWithTitle[] = result.assets
          .filter(asset => asset.base64)
          .map((asset, index) => ({
            title: `صورة ${formData.images.length + index + 1}`,
            image: `data:image/jpeg;base64,${asset.base64}`
          }));

        // Add all images to form data
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...newImages]
        }));
      }
    } catch (error) {
      console.error("Error picking images:", error);
      Alert.alert("خطأ", "حدث خطأ أثناء اختيار الصور");
    }
  };

  const takePhoto = async () => {
    try {
      console.log("Requesting camera permissions...");
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        console.log("Camera permission denied");
        Alert.alert("خطأ", "نحتاج إلى إذن للوصول إلى الكاميرا");
        return;
      }

      console.log("Starting camera...");
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        console.log("Photo taken successfully");
        const newImage: ImageWithTitle = {
          title: `صورة ${formData.images.length + 1}`,
          image: `data:image/jpeg;base64,${result.assets[0].base64}`
        };

        // Add the new photo to existing images
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, newImage]
        }));
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("خطأ", "حدث خطأ أثناء التقاط الصورة");
    }
  };

  const removeImage = (index: number) => {
    console.log("Removing image at index:", index);
    setFormData((prev) => {
      const newImages = prev.images.filter((_, i) => i !== index);
      console.log("Images remaining:", newImages.length);
      return {
        ...prev,
        images: newImages,
      };
    });
  };

  const pickIdImage = async () => {
    try {
      console.log("Starting ID image picker...");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        console.log("ID Image picked successfully");
        console.log("Base64 string length:", result.assets[0].base64.length);

        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setFormData((prev) => ({
          ...prev,
          id_images: [...prev.id_images, base64Image],
        }));
      }
    } catch (error) {
      console.error("Error picking ID image:", error);
      Alert.alert("خطأ", "حدث خطأ أثناء اختيار صورة الهوية");
    }
  };

  const takeIdPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("خطأ", "نحتاج إلى إذن للوصول إلى الكاميرا");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setFormData((prev) => ({
          ...prev,
          id_images: [...prev.id_images, base64Image],
        }));
      }
    } catch (error) {
      console.error("Error taking ID photo:", error);
      Alert.alert("خطأ", "حدث خطأ أثناء التقاط صورة الهوية");
    }
  };

  const removeIdImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      id_images: prev.id_images.filter((_, i) => i !== index),
    }));
  };

  const renderStep1 = () => {
    const serviceTypes: ServiceType[] = [
      "بيع وتداول",
      "استخدام LMR",
      "استخدام MW",
      "استخدام VSAT",
      "استخدام LTE",
      "استخدام GMPCS",
      "استخدام GPS",
      "استخدام FM",
      "أخرى"
    ];

    const entityTypes: EntityType[] = ["حكومية", "قطاع خاص"];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>الخطوة ١: معلومات الجهة والموقع</Text>

        {/* Entity Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            اسم الجهة: <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              !formData.entityName.trim() && styles.inputRequired,
            ]}
            value={formData.entityName}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, entityName: text }))
            }
            placeholder="أدخل اسم الجهة..."
          />
        </View>

        {/* Entity Type Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>نوع الجهة:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.entityType}
              onValueChange={(value: EntityType) =>
                setFormData((prev) => ({ ...prev, entityType: value }))
              }
              style={{}}
            >
              {entityTypes.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Status Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>الحالة:</Text>
          <TextInput
            style={styles.input}
            value={formData.status}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, status: text }))
            }
            placeholder="أدخل الحالة..."
          />
        </View>

        {/* Service Type Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>نوع الخدمة:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.serviceType}
              onValueChange={(value: ServiceType) =>
                setFormData((prev) => ({ ...prev, serviceType: value }))
              }
              style={{}}
            >
              {serviceTypes.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Location Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>الموقع:</Text>

          {/* Add Map Preview */}
          <TouchableOpacity
            style={styles.mapPreviewContainer}
            onPress={() => setIsFullScreenMap(true)}
          >
            <MapView
              style={styles.mapPreview}
              initialRegion={{
                latitude: formData.coordinates.latitude,
                longitude: formData.coordinates.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker coordinate={formData.coordinates} />
            </MapView>
            <View style={styles.mapOverlay}>
              <Text style={styles.mapOverlayText}>اضغط لتكبير الخريطة</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.locationButton}
            onPress={getCurrentLocation}
          >
            <Text style={styles.locationButtonText}>تحديد الموقع الحالي</Text>
          </TouchableOpacity>
          {formData.coordinates && (
            <Text style={styles.coordinatesText}>
              {`${formData.coordinates.latitude.toFixed(
                6
              )}, ${formData.coordinates.longitude.toFixed(6)}`}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderStep2 = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>الصور والمستندات</Text>

        {/* Regular Images Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>صور الموقع:</Text>
          <View style={styles.imageButtons}>
            <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.imageButtonText}>التقاط صورة</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Ionicons name="images" size={24} color="#fff" />
              <Text style={styles.imageButtonText}>اختيار من المعرض</Text>
            </TouchableOpacity>
          </View>

          {formData.images.length > 0 && (
            <ScrollView style={styles.imagePreviewContainer}>
              <View style={styles.imageGrid}>
                {formData.images.map((imageData, index) => (
                  <View key={index} style={styles.imagePreviewItem}>
                    <View style={styles.imagePreview}>
                      <Image source={{ uri: imageData.image }} style={styles.previewImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="red" />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.imageTitleInput}
                      value={imageData.title}
                      onChangeText={(text) => {
                        setFormData((prev) => ({
                          ...prev,
                          images: prev.images.map((img, i) =>
                            i === index ? { ...img, title: text } : img
                          ),
                        }));
                      }}
                      placeholder="أدخل عنوان الصورة..."
                      textAlign="right"
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* ID Images Section - Commented out for future implementation */}
      </View>
    );
  };

  const renderStep3 = () => {
    const systemTypes: SystemType[] = ["ثابتة", "متحركة"];

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.stepContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.stepTitle}>الخطوة 3: معلومات الجهاز والهوائي</Text>

          {/* Device Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>نوع الجهاز:</Text>
            <TextInput
              style={styles.input}
              value={formData.deviceType}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, deviceType: text }))
              }
              placeholder="أدخل نوع الجهاز..."
            />
          </View>

          {/* Device Model */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>موديل الجهاز:</Text>
            <TextInput
              style={styles.input}
              value={formData.deviceModel}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, deviceModel: text }))
              }
              placeholder="أدخل موديل الجهاز..."
            />
          </View>

          {/* Serial Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>الرقم التسلسلي:</Text>
            <TextInput
              style={styles.input}
              value={formData.serialNumber}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, serialNumber: text }))
              }
              placeholder="أدخل الرقم التسلسلي..."
            />
          </View>


          {/* Number field - Only show if not FM */}
          {formData.serviceType !== "استخدام FM" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>العدد:</Text>
              <TextInput
                style={styles.input}
                value={formData.number}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, number: text }))
                }
                placeholder="أدخل العدد..."
                keyboardType="numeric"
              />
            </View>
          )}

          {/* IMEI Number - Only show for GMPCS */}
          {formData.serviceType === "استخدام GMPCS" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>رقم IMEI:</Text>
              <TextInput
                style={styles.input}
                value={formData.imei}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, imei: text }))
                }
                placeholder="أدخل رقم IMEI..."
                keyboardType="numeric"
              />
            </View>
          )}
          {formData.serviceType === "أخرى" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>رقم IMEI:</Text>
              <TextInput
                style={styles.input}
                value={formData.imei}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, imei: text }))
                }
                placeholder="أدخل رقم IMEI..."
                keyboardType="numeric"
              />
            </View>
          )}

          {/* Provider Company - Only show for GPS */}
          {formData.serviceType === "استخدام GPS" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>اسم الشركة المجهزة:</Text>
              <TextInput
                style={styles.input}
                value={formData.providerCompany}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, providerCompany: text }))
                }
                placeholder="أدخل اسم شركة المجهزة..."
              />
            </View>
          )}
          {formData.serviceType === "أخرى" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>اسم الشركة المجهزة:</Text>
              <TextInput
                style={styles.input}
                value={formData.providerCompany}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, providerCompany: text }))
                }
                placeholder="أدخل اسم شركة المجهزة..."
              />
            </View>
          )}

          {/* System Type Dropdown - Only show for VSAT */}
          {formData.serviceType === "أخرى" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>نوع المنظومة:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.systemType}
                  onValueChange={(value: SystemType) =>
                    setFormData((prev) => ({ ...prev, systemType: value }))
                  }
                  style={{}}
                >
                  {systemTypes.map((type) => (
                    <Picker.Item key={type} label={type} value={type} />
                  ))}
                </Picker>
              </View>
            </View>
          )}
          {formData.serviceType === "استخدام VSAT" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>نوع المنظومة:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.systemType}
                  onValueChange={(value: SystemType) =>
                    setFormData((prev) => ({ ...prev, systemType: value }))
                  }
                  style={{}}
                >
                  {systemTypes.map((type) => (
                    <Picker.Item key={type} label={type} value={type} />
                  ))}
                </Picker>
              </View>
            </View>
          )}


          {/* External Power */}
          {
            formData.serviceType === "استخدام MW" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>القدرة الخارجية:</Text>
                <TextInput
                  style={styles.input}
                  value={formData.externalPower}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, externalPower: text }))
                  }
                  placeholder="أدخل القدرة الخارجية..."
                />
              </View>
            )}

          {
            formData.serviceType === "استخدام FM" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>القدرة الخارجية:</Text>
                <TextInput
                  style={styles.input}
                  value={formData.externalPower}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, externalPower: text }))
                  }
                  placeholder="أدخل القدرة الخارجية..."
                />
              </View>
            )}
          {
            formData.serviceType === "أخرى" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>القدرة الخارجية:</Text>
                <TextInput
                  style={styles.input}
                  value={formData.externalPower}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, externalPower: text }))
                  }
                  placeholder="أدخل القدرة الخارجية..."
                />
              </View>
            )}

          {/* Antenna Count */}
          {
            formData.serviceType === "استخدام FM" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>عدد الهوائيات:</Text>
                <TextInput
                  style={[
                    styles.input,
                    { marginBottom: Platform.OS === "ios" ? 20 : 0 },
                  ]}
                  value={formData.antennaCount}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, antennaCount: text }))
                  }
                  placeholder="أدخل عدد الهوائيات..."
                  keyboardType="numeric"
                />
              </View>
            )
          }
          {
            formData.serviceType === "أخرى" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>عدد الهوائيات:</Text>
                <TextInput
                  style={[
                    styles.input,
                    { marginBottom: Platform.OS === "ios" ? 20 : 0 },
                  ]}
                  value={formData.antennaCount}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, antennaCount: text }))
                  }
                  placeholder="أدخل عدد الهوائيات..."
                  keyboardType="numeric"
                />
              </View>
            )
          }

          {/* Antenna Height */}
          {
            formData.serviceType === "أخرى" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>ارتفاع الهوائي:</Text>
                <TextInput
                  style={[
                    styles.input,
                    { marginBottom: Platform.OS === "ios" ? 20 : 0 },
                  ]}
                  value={formData.antennaHeight}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, antennaHeight: text }))
                  }
                  placeholder="أدخل ارتفاع الهوائي..."
                  keyboardType="numeric"
                />
              </View>
            )
          }

          {/* Antenna Diameter */}
          {
            formData.serviceType === "أخرى" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>قطر الهوائي:</Text>
                <TextInput
                  style={[
                    styles.input,
                    { marginBottom: Platform.OS === "ios" ? 20 : 0 },
                  ]}
                  value={formData.antennaDiameter}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, antennaDiameter: text }))
                  }
                  placeholder="أدخل قطر الهوائي..."
                  keyboardType="numeric"
                />
              </View>
            )
          }

          {/* Coverage Range */}
          {
            formData.serviceType === "استخدام MW" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>نطاق التغطية:</Text>
                <TextInput
                  style={[
                    styles.input,
                    { marginBottom: Platform.OS === "ios" ? 20 : 0 },
                  ]}
                  value={formData.coverageRange}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, coverageRange: text }))
                  }
                  placeholder="أدخل نطاق التغطية..."
                />
              </View>
            )
          }

          {
            formData.serviceType === "أخرى" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>نطاق التغطية:</Text>
                <TextInput
                  style={[
                    styles.input,
                    { marginBottom: Platform.OS === "ios" ? 20 : 0 },
                  ]}
                  value={formData.coverageRange}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, coverageRange: text }))
                  }
                  placeholder="أدخل نطاق التغطية..."
                />
              </View>
            )
          }

          {/* Used Frequencies */}
          {
            formData.serviceType === "استخدام LMR" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>الترددات المستخدمة:</Text>
                <TextInput
                  style={[
                    styles.input,
                    { marginBottom: Platform.OS === "ios" ? 20 : 0 },
                  ]}
                  value={formData.usedFrequencies}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, usedFrequencies: text }))
                  }
                  placeholder="أدخل الترددات المستخدمة..."
                />
              </View>
            )
          }
          {
            formData.serviceType === "أخرى" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>الترددات المستخدمة:</Text>
                <TextInput
                  style={[
                    styles.input,
                    { marginBottom: Platform.OS === "ios" ? 20 : 0 },
                  ]}
                  value={formData.usedFrequencies}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, usedFrequencies: text }))
                  }
                  placeholder="أدخل الترددات المستخدمة..."
                />
              </View>
            )
          }

          {/* Frequency License */}
          {
            formData.serviceType === "أخرى" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>رخصة التردد:</Text>
                <TextInput
                  style={[
                    styles.input,
                    { marginBottom: Platform.OS === "ios" ? 20 : 0 },
                  ]}
                  value={formData.frequencyLicense}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, frequencyLicense: text }))
                  }
                  placeholder="أدخل رخصة التردد..."
                />
              </View>
            )
          }

          {/* Bandwidth */}
          {
            formData.serviceType === "أخرى" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>عرض النطاق:</Text>
                <TextInput
                  style={[
                    styles.input,
                    { marginBottom: Platform.OS === "ios" ? 20 : 0 },
                  ]}
                  value={formData.bandwidth}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, bandwidth: text }))
                  }
                  placeholder="أدخل عرض النطاق..."
                />
              </View>
            )
          }
          {
            formData.serviceType === "استخدام MW" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>عرض النطاق:</Text>
                <TextInput
                  style={[
                    styles.input,
                    { marginBottom: Platform.OS === "ios" ? 20 : 0 },
                  ]}
                  value={formData.bandwidth}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, bandwidth: text }))
                  }
                  placeholder="أدخل عرض النطاق..."
                />
              </View>
            )
          }

          {/* Polarity */}
          {
            formData.serviceType === "أخرى" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>الاستقطاب:</Text>
                <TextInput
                  style={[
                    styles.input,
                    { marginBottom: Platform.OS === "ios" ? 20 : 0 },
                  ]}
                  value={formData.polarity}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, polarity: text }))
                  }
                  placeholder="أدخل الاستقطاب..."
                />
              </View>
            )
          }
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const renderStep4 = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>الخطوة 4: معلومات الجهاز</Text>

        {/* Procedures */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>الإجراءات المتخذة:</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={4}
            value={formData.procedures}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, procedures: text }))
            }
            placeholder="أدخل الإجراءات المتخذة..."
            textAlignVertical="top"
          />
        </View>

        {/* Signatures Section */}
        {renderSignatureSections()}
      </View>
    );
  };

  const renderSignatureSections = () => (
    <View style={styles.signatureSections}>
      <TouchableOpacity
        style={styles.signatureButton}
        onPress={() => handleOpenSignature("client")}
      >
        <Text style={styles.signatureButtonText}>توقيع العميل</Text>
        {formData.clientSignature && (
          <Ionicons name="checkmark-circle" size={24} color="green" />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.signatureButton}
        onPress={() => handleOpenSignature("employee")}
      >
        <Text style={styles.signatureButtonText}>توقيع الموظف</Text>
        {formData.employeeSignature && (
          <Ionicons name="checkmark-circle" size={24} color="green" />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.signatureButton}
        onPress={() => handleOpenSignature("security")}
      >
        <Text style={styles.signatureButtonText}>توقيع الجهة الامنية</Text>
        {formData.securitySignature && (
          <Ionicons name="checkmark-circle" size={24} color="green" />
        )}
      </TouchableOpacity>
    </View>
  );

  const goToNextStep = () => {
    if (currentStep === 1) {
      // if (!formData.entityName.trim() || !formData.address.trim()) {
      //   Alert.alert("خطأ", "يجب إدخال اسم الجهة والموقع");
      //   return;
      // }
    } else if (currentStep === 2) {
      // Image step validation
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderSignatureModal = () => (
    <Modal visible={isSignatureModalVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {currentSignature === "client" ? "توقيع العميل" : "توقيع الموظف"}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsSignatureModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View
            style={styles.signaturePadContainer}
            {...panResponder.panHandlers}
          >
            <Svg height="200" width="100%">
              {/* Draw existing paths */}
              {currentSignature &&
                paths[currentSignature].map((path, index) => (
                  <Path
                    key={index}
                    d={path}
                    stroke="black"
                    strokeWidth={2}
                    fill="none"
                  />
                ))}
              {/* Draw current path */}
              {currentPath && (
                <Path
                  d={currentPath}
                  stroke="black"
                  strokeWidth={2}
                  fill="none"
                />
              )}
            </Svg>
          </View>

          <View style={styles.signatureButtons}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleClearSignature}
            >
              <Text style={styles.buttonSecondaryText}>مسح</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleSaveSignature}
            >
              <Text style={styles.buttonPrimaryText}>حفظ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Add Full Screen Map Modal
  const renderFullScreenMap = () => (
    <Modal
      visible={isFullScreenMap}
      animationType="slide"
      onRequestClose={() => setIsFullScreenMap(false)}
    >
      <SafeAreaView style={styles.fullScreenContainer}>
        <View style={styles.fullScreenHeader}>
          <TouchableOpacity
            style={styles.fullScreenCloseButton}
            onPress={() => setIsFullScreenMap(false)}
          >
            <Text style={styles.fullScreenCloseText}>إغلاق</Text>
          </TouchableOpacity>
          <Text style={styles.fullScreenTitle}>اختر الموقع</Text>
        </View>
        <MapView
          style={styles.fullScreenMap}
          initialRegion={{
            latitude: formData.coordinates.latitude,
            longitude: formData.coordinates.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          onPress={(e) => {
            setFormData((prev) => ({
              ...prev,
              coordinates: e.nativeEvent.coordinate,
            }));
            setIsFullScreenMap(false);
          }}
        >
          <Marker coordinate={formData.coordinates} />
        </MapView>
      </SafeAreaView>
    </Modal>
  );

  // Main component return
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>إضافة زيارة جديدة</Text>
          </View>

          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>الخطوة {currentStep} من 4</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(currentStep / 4) * 100}%` },
                ]}
              />
            </View>
          </View>

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}

          <View style={styles.buttonContainer}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={goToPreviousStep}
              >
                <Text style={styles.buttonSecondaryText}>السابق</Text>
              </TouchableOpacity>
            )}

            {currentStep < 4 ? (
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={goToNextStep}
              >
                <Text style={styles.buttonPrimaryText}>التالي</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleSubmit}
                disabled={addVisitMutation.isPending}
              >
                <Text style={styles.buttonPrimaryText}>
                  {addVisitMutation.isPending ? "جارِ الحفظ..." : "حفظ الزيارة"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Map Modal */}
        <Modal visible={isMapVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>اختيار الموقع</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setIsMapVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: formData.coordinates.latitude,
                  longitude: formData.coordinates.longitude,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                onPress={(event) =>
                  handleLocationSelect(event.nativeEvent.coordinate)
                }
              >
                <Marker
                  coordinate={formData.coordinates}
                  title="الموقع المختار"
                />
              </MapView>
            </View>
          </View>
        </Modal>

        {/* Signature Modal */}
        {renderSignatureModal()}

        {/* Review Modal */}
        <ReviewModal
          visible={showReview}
          formData={formData}
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowReview(false)}
        />

        {/* Full Screen Map Modal */}
        {renderFullScreenMap()}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "right",
  },
  stepContainer: {
    flex: 1,
    marginBottom: 20,
    paddingBottom: Platform.OS === "ios" ? 120 : 80,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "right",
  },
  inputGroup: {
    marginBottom: 15,
    paddingHorizontal: 16,
  },
  label: {
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "right",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    textAlign: "right",
    writingDirection: "rtl",
    backgroundColor: "#fff",
    minHeight: 44,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    textAlign: "right",
    writingDirection: "rtl",
  },
  locationButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  locationButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
  coordinatesText: {
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 40,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonPrimary: {
    backgroundColor: "#007AFF",
  },
  buttonPrimaryText: {
    color: "#fff",
    fontWeight: "bold",
  },
  buttonSecondary: {
    backgroundColor: "#ccc",
    marginRight: 10,
  },
  buttonSecondaryText: {
    color: "#333",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "right",
  },
  modalCloseButton: {
    padding: 5,
  },
  map: {
    width: "100%",
    height: 300,
  },
  signatureSections: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  signatureButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginRight: 10,
  },
  signatureButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 5,
  },
  signaturePadContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginBottom: 20,
  },
  signaturePad: {
    height: 200,
    backgroundColor: "#fff",
  },
  signatureButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  closeButton: {
    backgroundColor: "#ccc",
  },
  saveButton: {
    backgroundColor: "#007AFF",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  reviewModal: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "right",
  },
  reviewContent: {
    maxHeight: 300,
  },
  reviewItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  reviewLabel: {
    fontWeight: "bold",
    textAlign: "right",
  },
  reviewValue: {
    flex: 1,
    textAlign: "right",
  },
  reviewButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  reviewButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginRight: 10,
  },
  confirmButton: {
    backgroundColor: "#007AFF",
  },
  cancelButton: {
    backgroundColor: "#dc3545",
  },
  reviewButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  mapPreviewContainer: {
    height: 200,
    marginBottom: 10,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  mapPreview: {
    width: "100%",
    height: "100%",
  },
  mapOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  mapOverlayText: {
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 5,
    fontSize: 14,
    fontWeight: "bold",
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  fullScreenHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  fullScreenTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 40,
  },
  fullScreenCloseButton: {
    padding: 8,
  },
  fullScreenCloseText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  fullScreenMap: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  required: {
    color: "red",
    fontSize: 16,
  },
  inputRequired: {
    borderColor: "red",
  },
  imageButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  imageButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  imageButtonText: {
    color: "#fff",
    marginLeft: 5,
    fontWeight: "bold",
  },
  imagePreviewContainer: {
    marginTop: 10,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  imagePreviewItem: {
    width: '48%',  // Slightly less than 50% to account for spacing
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
  },
  imagePreview: {
    position: 'relative',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  imageTitleInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
    backgroundColor: '#fff',
    minHeight: 44,
  },
  progressContainer: {
    marginBottom: 20,
    padding: 10,
  },
  progressText: {
    textAlign: "center",
    marginBottom: 5,
    color: "#666",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#eee",
    borderRadius: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 2,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    backgroundColor: '#fff',
    marginBottom: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 44,
    width: '100%',
    color: '#000',
  },
});

export default AddVisit;
