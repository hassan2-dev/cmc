import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";

// Visit interface
export interface DBVisit {
  id?: number;
  tour_id: string;
  name: string;
  lat?: string;
  lng?: string;
  image?: string; // Will store JSON string of ImageWithTitle[]
  id_image?: string;
  note?: string;
  service_type?: string;
  coverage_range?: string;
  device_type?: string;
  device_model?: string;
  serial_number?: string;
  antenna_type?: string;
  antenna_count?: string;
  antenna_height?: string;
  antenna_diameter?: string;
  used_frequencies?: string;
  frequency_license?: string;
  bandwidth?: string;
  polarity?: string;
  external_power?: string;
  client_signature?: string;
  employee_signature?: string;
  security_signature?: string;
  created_at: string;
  status: string;
  address?: string;
  synced?: boolean;
  images?: ImageWithTitle[]; // Change from string[] to ImageWithTitle[]
  id_images?: string[];
  system_type?: string;
  entity_type?: string;
  imei?: string;
  provider_company?: string;
  number?: string;
}

// Tour interface
export interface DBTour {
  id?: number;
  tour_id: number;
  admin_id: number;
  zone_id: number;
  note?: string;
  start_date: string;
  end_date?: string;
  tour_date: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  synced?: boolean;
}

let db: SQLite.SQLiteDatabase;

export const initDatabase = async () => {
  if (!db) {
    // Ensure database directory exists
    const dbDirectory = `${FileSystem.documentDirectory}SQLite`;
    const dbPath = `${dbDirectory}/visits.db`;

    try {
      // Create directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(dbDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dbDirectory, {
          intermediates: true,
        });
      }

      // Log database path for debugging
      console.log("Database path:", dbPath);

      // Open database with the correct options for persistence
      db = await SQLite.openDatabaseAsync(dbPath);
      console.log("Database opened successfully");

      // Initialize tables without dropping them if they exist
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        
        CREATE TABLE IF NOT EXISTS visits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tour_id TEXT NOT NULL,
          name TEXT NOT NULL,
          lat TEXT,
          lng TEXT,
          image TEXT,
          id_image TEXT,
          note TEXT,
          service_type TEXT,
          coverage_range TEXT,
          device_type TEXT,
          device_model TEXT,
          serial_number TEXT,
          antenna_type TEXT,
          antenna_count TEXT,
          antenna_height TEXT,
          antenna_diameter TEXT,
          used_frequencies TEXT,
          frequency_license TEXT,
          bandwidth TEXT,
          polarity TEXT,
          external_power TEXT,
          client_signature TEXT,
          employee_signature TEXT,
          security_signature TEXT,
          created_at TEXT NOT NULL,
          status TEXT NOT NULL,
          address TEXT,
          synced INTEGER DEFAULT 0,
          system_type TEXT,
          entity_type TEXT,
          imei TEXT,
          provider_company TEXT,
          number TEXT
        );

        -- Create Tours Table if it doesn't exist
        CREATE TABLE IF NOT EXISTS tours (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tour_id INTEGER NOT NULL,
          admin_id INTEGER NOT NULL,
          zone_id INTEGER NOT NULL,
          note TEXT,
          start_date TEXT NOT NULL,
          end_date TEXT,
          tour_date TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          synced INTEGER DEFAULT 0
        );
      `);

      console.log("Database tables initialized");
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  }

  return db;
};

// Add helper function to save image file
export const saveImageToFileSystem = async (
  base64Image: string
): Promise<string> => {
  try {
    // Create images directory if it doesn't exist
    const imagesDir = `${FileSystem.documentDirectory}images`;
    const dirInfo = await FileSystem.getInfoAsync(imagesDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(imagesDir, { intermediates: true });
    }

    // Generate unique filename
    const filename = `image_${Date.now()}.jpg`;
    const filePath = `${imagesDir}/${filename}`;

    // Remove data:image/jpeg;base64, prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    // Save the file
    await FileSystem.writeAsStringAsync(filePath, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log("Image saved to:", filePath);
    return filePath;
  } catch (error) {
    console.error("Error saving image:", error);
    throw error;
  }
};

// Add new interface for image data
interface ImageWithTitle {
  title: string;
  image: string;
}

// Modify saveVisit to include logging
export const saveVisit = async (
  visit: Omit<DBVisit, "id" | "synced">
): Promise<number> => {
  try {
    console.log("=== Database Save Debug ===");
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Create image objects with timestamps
    const regularImages =
      visit.images?.map((base64) => ({
        base64,
        timestamp: Date.now(),
        type: "regular",
      })) || [];

    const idImages =
      visit.id_images?.map((base64) => ({
        base64,
        timestamp: Date.now(),
        type: "id",
      })) || [];

    // Store as JSON strings
    const imagesJson = JSON.stringify(regularImages);
    const idImagesJson = JSON.stringify(idImages);

    console.log("Executing database insert...");
    const result = await db.runAsync(
      `INSERT INTO visits (
        tour_id, name, lat, lng, image, id_image, note,
        service_type, coverage_range, device_type, device_model,
        serial_number, antenna_type, antenna_count, antenna_height,
        antenna_diameter, used_frequencies, frequency_license,
        bandwidth, polarity, external_power,
        client_signature, employee_signature, security_signature,
        created_at, status, address, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        visit.tour_id,
        visit.name,
        visit.lat,
        visit.lng,
        imagesJson,
        idImagesJson,
        visit.note,
        visit.service_type,
        visit.coverage_range,
        visit.device_type,
        visit.device_model,
        visit.serial_number,
        visit.antenna_type,
        visit.antenna_count,
        visit.antenna_height,
        visit.antenna_diameter,
        visit.used_frequencies,
        visit.frequency_license,
        visit.bandwidth,
        visit.polarity,
        visit.external_power,
        visit.client_signature,
        visit.employee_signature,
        visit.security_signature,
        visit.created_at,
        visit.status,
        visit.address,
        0, // synced status
      ]
    );

    console.log("Visit saved successfully with ID:", result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error: any) {
    console.error("Error saving visit:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Add logging to getAllVisits
export const getAllVisits = async (): Promise<DBVisit[]> => {
  try {
    console.log("Fetching all visits...");
    const visits = await db.getAllAsync<DBVisit>(
      "SELECT *, (synced = 1) as synced FROM visits ORDER BY created_at DESC"
    );

    console.log("Found visits:", visits.length);

    // Parse image JSON for each visit
    const processedVisits = visits.map((visit) => {
      try {
        const imageData = JSON.parse(visit.image || "[]");
        console.log(`Visit ${visit.id}: Found ${imageData.length} images`);
        return {
          ...visit,
          images: imageData.map((img: ImageWithTitle) => ({
            title: img.title,
            image: img.image,
          })),
        };
      } catch (error) {
        console.error(`Error processing images for visit ${visit.id}:`, error);
        return { ...visit, images: [] };
      }
    });

    return processedVisits;
  } catch (error) {
    console.error("Error fetching all visits:", error);
    throw error;
  }
};

// Get unsynced visits using the new async API
export const getUnsyncedVisits = async (): Promise<DBVisit[]> => {
  try {
    return await db.getAllAsync<DBVisit>(
      "SELECT *, (synced = 1) as synced FROM visits WHERE synced = 0"
    );
  } catch (error) {
    console.error("Error fetching unsynced visits:", error);
    throw error;
  }
};

// Mark visits as synced and then delete them
export const markVisitsAsSynced = async (visitIds: number[]): Promise<void> => {
  if (!visitIds.length) return;

  try {
    await db.execAsync("BEGIN TRANSACTION");

    // First, get the image paths for the visits we're about to delete
    const visits = await db.getAllAsync<DBVisit>(
      `SELECT image FROM visits WHERE id IN (${visitIds.join(",")})`
    );

    // Delete the image files
    for (const visit of visits) {
      if (visit.image) {
        const imagePaths = visit.image.split(",");
        for (const imagePath of imagePaths) {
          try {
            if (imagePath.trim()) {
              await FileSystem.deleteAsync(imagePath, { idempotent: true });
              console.log("Deleted image:", imagePath);
            }
          } catch (error) {
            console.warn("Error deleting image:", imagePath, error);
          }
        }
      }
    }

    // Delete the visits from the database
    await db.runAsync(`DELETE FROM visits WHERE id IN (${visitIds.join(",")})`);

    console.log(`Deleted synced visits with IDs: ${visitIds.join(", ")}`);

    await db.execAsync("COMMIT");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    console.error("Error in markVisitsAsSynced:", error);
    throw error;
  }
};

// Update getVisitsByTourId to handle image JSON
export const getVisitsByTourId = async (tourId: string): Promise<DBVisit[]> => {
  try {
    const visits = await db.getAllAsync<DBVisit>(
      "SELECT *, (synced = 1) as synced FROM visits WHERE tour_id = ? ORDER BY created_at DESC",
      [tourId]
    );

    // Parse image JSON for each visit
    return visits.map((visit) => ({
      ...visit,
      images: JSON.parse(visit.image || "[]").map((img: ImageWithTitle) => ({
        title: img.title,
        image: img.image,
      })),
    }));
  } catch (error) {
    console.error("Error fetching visits by tour ID:", error);
    throw error;
  }
};

// Get visits for end tour using the new async API
export const getVisitsForEndTour = async (
  tourId: string
): Promise<DBVisit[]> => {
  try {
    return await db.getAllAsync<DBVisit>(
      "SELECT *, (synced = 1) as synced FROM visits WHERE tour_id = ? ORDER BY created_at ASC",
      [tourId]
    );
  } catch (error) {
    console.error("Error fetching visits for end tour:", error);
    throw error;
  }
};

// Add this debug function
export const debugDatabase = async () => {
  try {
    if (!db) {
      console.log("Database not initialized");
      return;
    }

    const tables = await db.getAllAsync(
      'SELECT name FROM sqlite_master WHERE type="table"'
    );
    console.log("Available tables:", tables);

    const visits = await db.getAllAsync("SELECT * FROM visits");
    console.log("All visits in database:", visits);

    // Get database file info
    const dbPath = `${FileSystem.documentDirectory}SQLite/visits.db`;
    const fileInfo = await FileSystem.getInfoAsync(dbPath);
    console.log("Database file info:", fileInfo);
  } catch (error) {
    console.error("Debug database error:", error);
  }
};

export const deleteVisit = async (visitId: number): Promise<void> => {
  if (!db) throw new Error("Database not initialized");

  try {
    // Get image paths before deleting
    const visit = await db.getFirstAsync<DBVisit>(
      "SELECT image FROM visits WHERE id = ?",
      [visitId]
    );

    // Delete image files if they exist
    if (visit?.image) {
      const imagePaths = visit.image.split(",");
      for (const imagePath of imagePaths) {
        if (imagePath.trim()) {
          try {
            await FileSystem.deleteAsync(imagePath, { idempotent: true });
          } catch (error) {
            console.warn("Error deleting image:", imagePath, error);
          }
        }
      }
    }

    // Delete the visit from database
    await db.runAsync("DELETE FROM visits WHERE id = ?", [visitId]);
  } catch (error) {
    console.error("Error deleting visit:", error);
    throw error;
  }
};

// Tours functions
// Function to save a tour
export const saveTour = async (
  tour: Omit<DBTour, "id" | "synced">
): Promise<number> => {
  try {
    console.log("Saving tour:", tour);
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db.runAsync(
      `INSERT INTO tours (
        tour_id, admin_id, zone_id, note, start_date, end_date, 
        tour_date, created_at, updated_at, deleted_at, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tour.tour_id,
        tour.admin_id,
        tour.zone_id,
        tour.note || null,
        tour.start_date,
        tour.end_date || null,
        tour.tour_date,
        tour.created_at,
        tour.updated_at,
        tour.deleted_at || null,
        0,
      ]
    );

    console.log("Tour saved successfully with ID:", result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error saving tour:", error);
    throw error;
  }
};

// Function to get all tours
export const getAllTours = async (): Promise<DBTour[]> => {
  try {
    console.log("Fetching all tours...");
    const tours = await db.getAllAsync<DBTour>(
      "SELECT *, (synced = 1) as synced FROM tours ORDER BY created_at DESC"
    );
    console.log("Found tours:", tours.length);
    return tours;
  } catch (error) {
    console.error("Error fetching all tours:", error);
    throw error;
  }
};

// Function to get unsynced tours
export const getUnsyncedTours = async (): Promise<DBTour[]> => {
  try {
    return await db.getAllAsync<DBTour>(
      "SELECT *, (synced = 1) as synced FROM tours WHERE synced = 0"
    );
  } catch (error) {
    console.error("Error fetching unsynced tours:", error);
    throw error;
  }
};

export const deleteAllTours = async (): Promise<void> => {
  try {
    console.log("Deleting all tours...");
    await db.runAsync("DELETE FROM tours");
    console.log("All tours deleted successfully.");
  } catch (error) {
    console.error("Error deleting tours:", error);
    throw error;
  }
};
