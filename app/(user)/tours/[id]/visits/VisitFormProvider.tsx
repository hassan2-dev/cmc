import React, { createContext, useContext, useState } from "react";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type VisitFormData = {
  entityName: string;
  address: string;
  coordinates: Coordinates;
  serviceType: string;
  deviceType: string;
  deviceModel: string;
  serialNumber: string;
  antennaType: string;
  procedures: string;
  visitTime: string;
  clientSignature: string;
  employeeSignature: string;
  antennaCount: string;
  antennaHeight: string;
  antennaDiameter: string;
};

type VisitFormContextType = {
  formData: VisitFormData;
  updateFormData: (updates: Partial<VisitFormData>) => void;
  tourId: string | string[];
};

const VisitFormContext = createContext<VisitFormContextType | undefined>(undefined);

export function VisitFormProvider({ children, tourId }: { children: React.ReactNode; tourId: string | string[] }) {
  const [formData, setFormData] = useState<VisitFormData>({
    entityName: "",
    address: "",
    coordinates: { latitude: 30.5095, longitude: 47.7834 },
    serviceType: "",
    deviceType: "",
    deviceModel: "",
    serialNumber: "",
    antennaType: "",
    procedures: "",
    visitTime: new Date().toISOString(),
    clientSignature: "",
    employeeSignature: "",
    antennaCount: "",
    antennaHeight: "",
    antennaDiameter: "",
  });

  const updateFormData = (updates: Partial<VisitFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return (
    <VisitFormContext.Provider value={{ formData, updateFormData, tourId }}>
      {children}
    </VisitFormContext.Provider>
  );
}

export const useVisitForm = () => {
  const context = useContext(VisitFormContext);
  if (!context) {
    throw new Error("useVisitForm must be used within a VisitFormProvider");
  }
  return context;
}; 