import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { getVisitsByTourId, DBVisit, initDatabase } from "@/lib/database";

const VisitCard = ({ visit }: { visit: DBVisit }) => (
  <TouchableOpacity activeOpacity={0.9} style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.entityName}>{visit.name}</Text>
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: visit.synced ? "#4CAF50" : "#FFC107" },
        ]}
      >
        <Text style={styles.statusText}>
          {visit.synced ? "تمت المزامنة" : "بانتظار المزامنة"}
        </Text>
      </View>
    </View>

    <View style={styles.divider} />

    <View style={styles.detailRow}>
      <Ionicons name="location-outline" size={16} color="#666" />
      <Text style={styles.label}>الموقع: </Text>
      <Text style={styles.value}>{`${visit.lat}, ${visit.lng}`}</Text>
    </View>

    <View style={styles.detailRow}>
      <Ionicons name="hardware-chip-outline" size={16} color="#666" />
      <Text style={styles.label}>الجهاز: </Text>
      <Text
        style={styles.value}
      >{`${visit.device_type} - ${visit.device_model}`}</Text>
    </View>

    <View style={styles.detailRow}>
      <Ionicons name="barcode-outline" size={16} color="#666" />
      <Text style={styles.label}>الرقم التسلسلي: </Text>
      <Text style={styles.value}>{visit.serial_number}</Text>
    </View>

    {visit.note && (
      <View style={styles.detailRow}>
        <Ionicons name="document-text-outline" size={16} color="#666" />
        <Text style={styles.label}>ملاحظات: </Text>
        <Text style={styles.value}>{visit.note}</Text>
      </View>
    )}

    <View style={styles.detailRow}>
      <Ionicons name="time-outline" size={16} color="#666" />
      <Text style={styles.label}>التاريخ: </Text>
      <Text style={styles.value}>
        {new Date(visit.created_at).toLocaleDateString("ar-IQ")}
      </Text>
    </View>

    {visit.image && (
      <View style={styles.imageIndicator}>
        <Ionicons name="images-outline" size={16} color="#666" />
        <Text style={styles.imageCount}>
          {visit.image.split(",").length} صور
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

const Visits = () => {
  const { id: tourId } = useLocalSearchParams();
  const [dbInitialized, setDbInitialized] = useState(false);

  // Initialize database when component mounts
  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initDatabase();
        console.log("Database initialized successfully");
        setDbInitialized(true);
      } catch (error) {
        console.error("Error initializing database:", error);
      }
    };

    setupDatabase();
  }, []);

  // Use React Query to fetch visits from SQLite database with proper configuration
  const {
    data: visits,
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ["visits", tourId],
    queryFn: async () => {
      try {
        if (!dbInitialized) {
          console.log("Database not yet initialized, waiting...");
          return [];
        }
        const data = await getVisitsByTourId(tourId.toString());
        console.log("Fetched visits:", data);
        return data;
      } catch (error) {
        console.error("Error fetching visits:", error);
        throw error;
      }
    },
    enabled: dbInitialized,
    // Add these options to ensure data is properly cached and refetched
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    cacheTime: 1000 * 60 * 60, // Keep data in cache for 1 hour
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const EmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={48} color="#666" />
      <Text style={styles.emptyText}>لا توجد زيارات مسجلة حالياً</Text>
    </View>
  );

  const handleAddNewVisit = () => {
    router.push({
      pathname: "/(user)/tours/[id]/visits/add-visit",
      params: { id: Array.isArray(tourId) ? tourId[0] : tourId },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>جارِ التحميل...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorTitle}>عذراً! حدث خطأ</Text>
        <Text style={styles.errorMessage}>
          لم نتمكن من تحميل الزيارات. يرجى المحاولة مرة أخرى.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-forward" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>الزيارات</Text>
        </View>

        <FlatList
          data={visits}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <VisitCard visit={item} />}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={EmptyList}
          refreshing={isLoading}
          onRefresh={refetch}
        />

        <TouchableOpacity style={styles.addButton} onPress={handleAddNewVisit}>
          <Text style={styles.addButtonText}>إضافة زيارة جديدة</Text>
          <Ionicons name="add-circle-outline" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endTourButton}
          onPress={() => router.push(`/tours/${tourId}/end-tour`)}
        >
          <Text style={styles.endTourButtonText}>إنهاء الجولة</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginRight: 40,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entityName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  date: {
    fontSize: 14,
    color: "#666",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  value: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    textAlign: "right",
  },
  separator: {
    height: 16,
  },
  addButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 120,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginRight: 8,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 24,
  },
  endTourButton: {
    position: "absolute",
    bottom: 24,
    left: 24,
    width: 120,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#dc3545",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  endTourButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  imageIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  imageCount: {
    fontSize: 12,
    color: "#666",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF3B30",
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
});

export default Visits;
