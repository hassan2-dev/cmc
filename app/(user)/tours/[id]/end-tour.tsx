import React from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { getVisitsForEndTour, markVisitsAsSynced } from "@/lib/database";
import axiosInstance from "@/lib/axiosInstance";
import { isAxiosError } from "axios";

const EndTour = () => {
  const { id: tourId } = useLocalSearchParams();

  const handleEndTour = async () => {
    const tourIdString = Array.isArray(tourId) ? tourId[0] : tourId;

    try {
      const visits = await getVisitsForEndTour(tourIdString);
      console.log("Retrieved visits for end tour:", visits.length);

      // Filter out already synced visits
      const unsyncedVisits = visits.filter((visit) => !visit.synced);
      console.log("Unsynced visits:", unsyncedVisits.length);

      if (!unsyncedVisits.length) {
        Alert.alert("تنبيه", "لا توجد زيارات جديدة لإنهاء الجولة");
        return;
      }

      const validVisitIds = unsyncedVisits
        .map((visit) => visit.id)
        .filter((id): id is number => id !== undefined && id !== null);

      // Compress signature data before sending
      const compressSignature = (signature: string) => {
        if (!signature) return "";

        // Remove unnecessary whitespace from SVG
        return signature
          .replace(/\s+/g, " ")
          .replace(/>\s+</g, "><")
          .replace(/\s+\/>/g, "/>");
      };

      // Format only unsynced visits data, now including signatures
      const formattedVisits = unsyncedVisits.map((visit) => {
        // Parse regular images
        let imageArray: string[] = [];
        let idImageArray: string[] = [];
        try {
          // Parse image data as array of strings
          imageArray = JSON.parse(visit.image || "[]");
          idImageArray = JSON.parse(visit.id_image || "[]");

          // Ensure imageArray is always an array of strings
          if (Array.isArray(imageArray) && imageArray.length > 0) {
            // If we get objects, try to extract just the image values
            if (typeof imageArray[0] === 'object') {
              imageArray = imageArray.map((img: any) => img.image || img.base64 || '');
            }
          }
        } catch (error) {
          console.error("Error parsing image JSON:", error);
        }

        console.log(`Formatting visit ${visit.id}:`, {
          name: visit.name,
          imageCount: imageArray.length,
        });

        return {
          name: visit.name,
          lng: String(visit.lng),
          lat: String(visit.lat),
          note: visit.note,
          address: `${visit.lat}, ${visit.lng}`,
          service_type: visit.service_type || "",
          status: visit.status || "",
          coverage_range: visit.coverage_range || "",
          device_type: visit.device_type,
          device_model: visit.device_model,
          serial_number: visit.serial_number,
          antenna_type: visit.antenna_type || "",
          antenna_count: visit.antenna_count,
          antenna_height: visit.antenna_height,
          antenna_diameter: visit.antenna_diameter,
          used_frequencies: visit.used_frequencies || "",
          frequency_license: visit.frequency_license || "",
          bandwidth: visit.bandwidth || "",
          polarity: visit.polarity || "",
          external_power: visit.external_power || "",
          system_type: visit.system_type || "",
          entity_type: visit.entity_type || "",
          imei: visit.imei || "",
          provider_company: visit.provider_company || "",
          number: visit.number || "",
          // Compress signatures
          client_signature: compressSignature(visit.client_signature || ""),
          employee_signature: compressSignature(visit.employee_signature || ""),
          security_signature: compressSignature(visit.security_signature || ""),
          // Send first image as the main image
          image: imageArray[0] || "", // First regular image
          images: imageArray, // All images as string array
          id_image: idImageArray[0] || "", // First ID image
          id_images: idImageArray, // All ID images
        };
      });

      console.log("Sending to backend:", {
        tour_id: tourIdString,
        visitsCount: formattedVisits.length,
        sampleVisit: {
          ...formattedVisits[0],
          image: formattedVisits[0]?.image
            ? "Present (length: " + formattedVisits[0].image.length + ")"
            : "Not present",
          images: formattedVisits[0]?.images?.map(
            (img, i) => `Image ${i + 1} length: ${img.length}`
          ),
        },
      });

      // Send data to backend
      const response = await axiosInstance.post(
        `/api/tours/${tourIdString}/end`,
        {
          tour_id: tourIdString,
          visits: formattedVisits,
        }
      );

      if (response.data) {
        console.log("Backend response:", response.data);

        if (validVisitIds.length > 0) {
          await markVisitsAsSynced(validVisitIds);
          console.log("Marked visits as synced:", validVisitIds);
        }

        Alert.alert("نجاح", "تم إنهاء الجولة بنجاح", [
          {
            text: "حسناً",
            onPress: () => {
              router.push("/tours/tours");
            },
          },
        ]);
      }
    } catch (error) {
      // Detailed error logging
      if (isAxiosError(error)) {
        console.error("Axios Error Details:", {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            data: error.config?.data,
          },
        });
      } else {
        console.error("Non-Axios Error:", error);
      }

      Alert.alert(
        "خطأ",
        "حدث خطأ أثناء إنهاء الجولة. يرجى المحاولة مرة أخرى.",
        [{ text: "حسناً" }]
      );
    }
  };

  const handleEndTourConfirmation = () => {
    Alert.alert(
      "تأكيد إنهاء الجولة",
      "هل أنت متأكد من أنك تريد إنهاء هذه الجولة؟ لا يمكن التراجع عن هذا الإجراء.",
      [
        {
          text: "إلغاء",
          style: "cancel",
        },
        {
          text: "نعم، إنهاء الجولة",
          style: "destructive",
          onPress: handleEndTour,
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>إنهاء الجولة</Text>
        <Text style={styles.description}>
          هل أنت متأكد من أنك تريد إنهاء هذه الجولة؟ سيتم إرسال جميع الزيارات
          المسجلة.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleEndTourConfirmation}
        >
          <Text style={styles.buttonText}>إنهاء الجولة</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  contentContainer: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    color: "#666",
    lineHeight: 24,
  },
  button: {
    backgroundColor: "#dc3545",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: "80%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default EndTour;
