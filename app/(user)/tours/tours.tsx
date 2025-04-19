import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import React, { useState, useEffect } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";
import { DBTour, deleteAllTours, getAllTours, saveTour } from "@/lib/database";

// Types for API response

type User = {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  email_verified_at: null | string;
};

type Admin = {
  id: number;
  user_id: number;
  city_id: number;
  created_at: string;
  updated_at: string;
  user: User;
};

type Zone = {
  id: number;
  name: string;
  city_id: number;
  is_main: number;
  created_at: string;
  updated_at: string;
};

type Employee = {
  id: number;
  user_id: number;
  city_id: number;
  admin_id: number;
  created_at: string;
  updated_at: string;
  pivot: {
    tour_id: number;
    employee_id: number;
  };
  user?: User; // Add this if employee user details are needed
};

type Tour = {
  id: number;
  zone_id: number;
  admin_id: number;
  note: string;
  tour_date: string;
  start_date: string | null;
  created_at: string;
  updated_at: string;
  end_date: string | null;
  admin: Admin;
  zone: Zone;
  employees: Employee[];
  status: string;
  latitude: string;
  longitude: string;
};

// Add these new types
type Visit = {
  name: string;
  lng: string;
  lat: string;
  image?: File;
  note?: string;
};

type TourApiResponse = {
  data: Tour[];
};

// Function to determine tour status
const getTourStatus = (tour: Tour): "pending" | "in-progress" | "completed" => {
  if (tour.end_date) return "completed";

  // إذا كان لديه تاريخ بدء وبدأ بالفعل
  if (tour.start_date) {
    const startDate = new Date(tour.start_date);
    const now = new Date();

    // إذا كان وقت البدء في المستقبل، فالجولة لا تزال قيد الانتظار
    if (startDate > now) {
      return "pending";
    }
    return "in-progress";
  }

  return "pending";
};

type Status = "all" | "pending" | "in-progress" | "completed";

const FilterModal = ({
  visible,
  onClose,
  selectedStatus,
  onSelectStatus,
}: {
  visible: boolean;
  onClose: () => void;
  selectedStatus: Status;
  onSelectStatus: (status: Status) => void;
}) => {
  const statuses: Status[] = ["all", "pending", "in-progress", "completed"];

  const getStatusText = (status: Status) => {
    switch (status) {
      case "all":
        return "جميع الجولات";
      case "pending":
        return "قيد الانتظار";
      case "in-progress":
        return "قيد التنفيذ";
      case "completed":
        return "مكتملة";
      default:
        return status;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>تصفية الجولات</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterOptions}>
            {statuses.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterOption,
                  selectedStatus === status && styles.filterOptionSelected,
                ]}
                onPress={() => {
                  onSelectStatus(status);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    selectedStatus === status &&
                      styles.filterOptionTextSelected,
                  ]}
                >
                  {getStatusText(status)}
                </Text>
                <Ionicons
                  name="checkmark"
                  size={20}
                  color="#fff"
                  style={[
                    styles.checkmark,
                    selectedStatus !== status && styles.hiddenCheckmark,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const TourCard = ({ tour }: { tour: Tour }) => {
  const router = useRouter();
  const status = getTourStatus(tour);
  const queryClient = useQueryClient();
  const [timeLeft, setTimeLeft] = useState<string>("");

  // تحديد ما إذا كانت الجولة قابلة للنقر (فقط الجولات قيد التنفيذ)
  const isClickable = status === "in-progress";

  const calculateTimeLeft = (tour: Tour) => {
    if (!tour.tour_date || !tour.start_date) {
      return "لم يتم تحديد وقت البدء";
    }

    try {
      // Parse the date in the local timezone
      const [datePart, timePart] = tour.start_date.split(" ");
      const [year, month, day] = datePart.split("-");
      const [hrs, mnts] = timePart.split(":");

      const startDateTime = new Date(
        parseInt(year),
        parseInt(month) - 1, // Month is 0-based in JavaScript
        parseInt(day),
        parseInt(hrs),
        parseInt(mnts)
      );

      const now = new Date();
      const diff = startDateTime.getTime() - now.getTime();

      // If the start time is in the past
      if (diff <= 0) {
        return "الجولة قد بدأت";
      }

      // Calculate hours and minutes
      const minutesTotal = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(minutesTotal / 60);
      const minutes = minutesTotal % 60;

      if (hours === 0) {
        return `تبدأ خلال ${minutes} دقيقة`;
      } else if (minutes === 0) {
        return `تبدأ خلال ${hours} ساعة`;
      }
      return `تبدأ خلال ${hours} ساعة و ${minutes} دقيقة`;
    } catch (error) {
      console.error("Error calculating time left:", error);
      return "خطأ في حساب الوقت المتبقي";
    }
  };

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(tour));
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(tour));
    }, 60000);
    return () => clearInterval(interval);
  }, [tour]);

  const startTourMutation = useMutation({
    mutationFn: async (tourId: number) => {
      return await axiosInstance.post(`/api/tours/${tourId}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tours"] });
    },
  });

  const handleTourPress = () => {
    // السماح بالانتقال فقط إذا كانت الجولة قيد التنفيذ
    if (isClickable) {
      router.push(`/(user)/tours/${tour.id}/visits`);
    } else if (status === "pending") {
      // عرض رسالة للمستخدم أن الجولة لم تبدأ بعد
      Alert.alert(
        "الجولة غير متاحة",
        "لم يحن موعد هذه الجولة بعد. ستكون متاحة عند بدء موعدها."
      );
    } else if (status === "completed") {
      // عرض رسالة أن الجولة مكتملة
      Alert.alert("الجولة مكتملة", "هذه الجولة مكتملة ولا يمكن تعديلها.");
    }
  };

  const getStatusText = (status: ReturnType<typeof getTourStatus>) => {
    switch (status) {
      case "pending":
        return "قيد الانتظار";
      case "in-progress":
        return "قيد التنفيذ";
      case "completed":
        return "مكتملة";
      default:
        return status;
    }
  };

  const getStatusColor = (status: ReturnType<typeof getTourStatus>) => {
    switch (status) {
      case "pending":
        return "#FFB74D"; // لون برتقالي أفتح للانتظار
      case "in-progress":
        return "#64B5F6"; // لون أزرق أكثر حيوية للتنفيذ
      case "completed":
        return "#81C784"; // لون أخضر أكثر إشراقًا للإكتمال
      default:
        return "#999";
    }
  };

  const getStatusIcon = (status: ReturnType<typeof getTourStatus>) => {
    switch (status) {
      case "pending":
        return "time-outline";
      case "in-progress":
        return "play-circle-outline";
      case "completed":
        return "checkmark-circle-outline";
      default:
        return "information-circle-outline";
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.modernCard,
        { borderRightColor: getStatusColor(status), borderRightWidth: 5 },
        !isClickable && styles.disabledCard,
      ]}
      activeOpacity={isClickable ? 0.9 : 1}
      onPress={handleTourPress}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(status) },
          ]}
        >
          <Ionicons
            name={getStatusIcon(status)}
            size={14}
            color="#fff"
            style={{ marginLeft: 4 }}
          />
          <Text style={styles.statusText}>{getStatusText(status)}</Text>
        </View>
        <View style={styles.zoneNameContainer}>
          <Text style={styles.zoneName}>
            {tour.zone?.name || "المنطقة غير محددة"}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.teamSection}>
        <View style={styles.adminRow}>
          <View style={styles.adminBadge}>
            <Text style={styles.adminName}>{tour.admin?.user.name}</Text>
          </View>
          <Text style={styles.sectionLabel}>المشرف:</Text>
        </View>

        <View style={styles.employeesRow}>
          <View style={styles.employeesList}>
            {tour.employees?.length > 0 ? (
              tour.employees.map((employee) => (
                <View key={employee.id} style={styles.employeeBadge}>
                  <Text style={styles.employeeName}>
                    {employee?.user?.name || `موظف ${employee.id}`}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noEmployees}>لا يوجد موظفين</Text>
            )}
          </View>
          <Text style={styles.sectionLabel}>الفريق:</Text>
        </View>

        {tour.note && (
          <View style={styles.notesRow}>
            <Text style={styles.notesText}>{tour.note}</Text>
            <Text style={styles.notesLabel}>ملاحظات:</Text>
          </View>
        )}
      </View>

      {status !== "completed" && (
        <View
          style={[
            styles.timeLeftContainer,
            { backgroundColor: getStatusColor(status) + "22" },
          ]}
        >
          <Ionicons
            name="time-outline"
            size={20}
            color={getStatusColor(status)}
          />
          <Text style={styles.timeLeftText}>{timeLeft}</Text>
        </View>
      )}

      {!isClickable && status === "completed" && (
        <View style={styles.availabilityBanner}>
          <Text style={styles.availabilityText}>الجولة مكتملة</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Add this error component

const ErrorView = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />

        <Text style={styles.errorTitle}>عذراً! حدث خطأ</Text>

        <Text style={styles.errorMessage}>
          لم نتمكن من تحميل الجولات. يرجى التحقق من اتصالك بالإنترنت والمحاولة
          مرة أخرى.
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.replace("/(user)/tours/tours")}
        >
          <Text style={styles.retryButtonText}>إعادة المحاولة</Text>

          <Ionicons name="refresh-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const Tours = () => {
  const [localTours, setLocalTours] = useState<DBTour[]>([]);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Status>("all");
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: toursData,
    isLoading,
    error,
    refetch,
  } = useQuery<TourApiResponse>({
    queryKey: ["tours"],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get(`/api/tours/today`);

        // Map the tours to match the DBTour interface
        const tours: Omit<DBTour, "id" | "synced">[] = response.data.data.map(
          (tour: any) => ({
            tour_id: tour.id,
            admin_id: tour.admin_id,
            zone_id: tour.zone_id,
            note: tour.note,
            start_date: tour.start_date,
            end_date: tour.end_date,
            tour_date: tour.tour_date,
            created_at: tour.created_at,
            updated_at: tour.updated_at,
            deleted_at: tour.deleted_at,
          })
        );

        // Delete all existing tours and save new ones
        await deleteAllTours();
        for (const tour of tours) {
          await saveTour(tour);
        }

        return response.data;
      } catch (err) {
        console.error("API Error:", err);
        throw err;
      }
    },
  });

  // Add interval for periodic updates
  useEffect(() => {
    // Initial load of local tours
    loadLocalTours();

    // Set up interval to refetch every 30 seconds
    const interval = setInterval(async () => {
      try {
        console.log("Periodic tour refresh started");
        await refetch();
        await loadLocalTours(); // Reload local tours after refetch
        console.log("Periodic tour refresh completed");
      } catch (error) {
        console.error("Error in periodic refresh:", error);
      }
    }, 20000); // 30 seconds

    // Cleanup interval on component unmount
    return () => {
      clearInterval(interval);
      console.log("Cleanup: tour refresh interval cleared");
    };
  }, [refetch]);

  const loadLocalTours = async () => {
    try {
      const tours = await getAllTours();
      setLocalTours(tours);
      console.log("Local Tours loaded:", tours.length);
    } catch (error) {
      console.error("Error loading local tours:", error);
    }
  };

  // Handle manual refresh
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      await loadLocalTours();
    } catch (error) {
      console.error("Error refreshing tours:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const getStatusText = (status: Status) => {
    switch (status) {
      case "all":
        return "جميع الجولات";
      case "pending":
        return "قيد الانتظار";
      case "in-progress":
        return "قيد التنفيذ";
      case "completed":
        return "مكتملة";
      default:
        return status;
    }
  };

  const sortedAndFilteredTours = React.useMemo(() => {
    if (!toursData?.data) return [];

    const filtered =
      selectedStatus === "all"
        ? toursData.data
        : toursData.data.filter(
            (tour) => getTourStatus(tour) === selectedStatus
          );

    // Sort tours to show pending ones first

    return [...filtered].sort((a, b) => {
      const statusA = getTourStatus(a);

      const statusB = getTourStatus(b);

      // Pending tours come first

      if (statusA === "pending" && statusB !== "pending") return -1;

      if (statusB === "pending" && statusA !== "pending") return 1;

      // Then in-progress

      if (statusA === "in-progress" && statusB === "completed") return -1;

      if (statusB === "in-progress" && statusA === "completed") return 1;

      // Finally sort by creation date within same status

      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [toursData, selectedStatus]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />

        <Text style={styles.loadingText}>جارِ التحميل...</Text>
      </View>
    );
  }

  if (error) {
    return <ErrorView />;
  }

  // عندما لا توجد جولات

  const EmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={48} color="#666" />

      <Text style={styles.emptyText}>لا توجد جولات متاحة حالياً</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>الجولات</Text>

              {toursData?.data?.length && toursData?.data?.length > 0 && (
                <Text style={styles.headerSubtitle}>
                  {sortedAndFilteredTours.length}{" "}
                  {selectedStatus === "all"
                    ? "جولة"
                    : `جولة ${getStatusText(selectedStatus)}`}
                </Text>
              )}
            </View>

            <View style={{ width: 60, height: 60 }}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={{ width: 60, height: 60, resizeMode: "contain" }}
                // onPress={() => setIsFilterVisible(true)}
              />
            </View>
          </View>
        </View>

        <FlatList
          data={sortedAndFilteredTours}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <TourCard tour={item} />}
          contentContainerStyle={[
            styles.listContainer,

            sortedAndFilteredTours.length === 0 && styles.emptyListContainer,
          ]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={EmptyList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />

        <FilterModal
          visible={isFilterVisible}
          onClose={() => setIsFilterVisible(false)}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
        />
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
    backgroundColor: "#f5f5f5",
  },
  listContainer: {
    padding: 16,
  },
  modernCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginVertical: 8,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  zoneNameContainer: {
    flex: 1,
  },
  zoneName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "right",
  },
  statusBadge: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },
  teamSection: {
    gap: 10,
  },
  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  sectionLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    marginRight: 8,
  },
  adminBadge: {
    backgroundColor: "#f6f6f6",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flex: 1,
  },
  adminName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  employeesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  employeesList: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 6,
  },
  employeeBadge: {
    backgroundColor: "#f6f6f6",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 13,
    color: "#333",
  },
  noEmployees: {
    fontSize: 13,
    color: "#999",
  },
  notesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  notesLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    marginRight: 8,
  },
  notesText: {
    fontSize: 13,
    color: "#333",
    flex: 1,
  },
  timeLeftContainer: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  timeLeftText: {
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    backgroundColor: "#fff",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerContent: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "right",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "right",
  },
  filterButton: {
    padding: 8,
  },
  date: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontWeight: "500",
    textAlign: "left",
    backgroundColor: "#f9f9f9",
    padding: 4,
    borderRadius: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },
  detailsContainer: {
    gap: 12,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    textAlign: "left",
  },
  employeesContainer: {
    flexDirection: "row",
    gap: 8,
  },
  separator: {
    height: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    width: "80%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "right",
  },
  filterOptions: {
    gap: 12,
  },
  filterOption: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  filterOptionSelected: {
    backgroundColor: "#007AFF",
  },
  filterOptionText: {
    fontSize: 16,
    color: "#333",
  },
  filterOptionTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  checkmark: {
    opacity: 1,
  },
  hiddenCheckmark: {
    opacity: 0,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  emptyListContainer: {
    flexGrow: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: "row-reverse",
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    gap: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  headerLeft: {
    alignItems: "flex-start",
    gap: 8,
  },
  cardDisabled: {
    opacity: 1,
  },
  location: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    textAlign: "right",
    direction: "ltr",
  },
  noEmployeesText: {
    fontSize: 14,
    color: "#666",
  },
  disabledCard: {
    opacity: 0.7,
  },

  availabilityBanner: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },

  availabilityText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
});

export default Tours;
