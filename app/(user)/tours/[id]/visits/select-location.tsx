import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  Alert,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";

const SelectLocation = () => {
  const params = useLocalSearchParams();
  const mapRef = React.useRef<MapView>(null);

  const [selectedLocation, setSelectedLocation] = React.useState({
    latitude: Number(params.latitude) || 30.5095,
    longitude: Number(params.longitude) || 47.7834,
  });

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
  };

  const handleConfirm = () => {
    router.push({
      pathname: "/tours/[id]/visits/add-visit",
      params: {
        id: Array.isArray(params.id) ? params.id[0] : params.id,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>اختر الموقع</Text>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onPress={handleMapPress}
      >
        <Marker
          coordinate={selectedLocation}
          draggable
          onDragEnd={(e) => {
            setSelectedLocation(e.nativeEvent.coordinate);
          }}
        />
      </MapView>

      <View style={styles.coordinatesContainer}>
        <Text style={styles.coordinatesText}>
          {`${selectedLocation.latitude.toFixed(
            6
          )}, ${selectedLocation.longitude.toFixed(6)}`}
        </Text>
      </View>

      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
        <Text style={styles.confirmButtonText}>تأكيد الموقع</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  map: {
    flex: 1,
  },
  confirmButton: {
    backgroundColor: "#007AFF",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  coordinatesContainer: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  coordinatesText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    direction: "ltr",
  },
  locationButton: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationButtonText: {
    marginLeft: 8,
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default SelectLocation;
