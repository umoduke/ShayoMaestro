import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "asl_age_verified_v1";
export const LEGAL_DRINKING_AGE = 18;

interface AgeRecord {
  verifiedAt: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
}

interface AgeVerificationContextType {
  isLoading: boolean;
  isVerified: boolean;
  declined: boolean;
  verify: (year: number, month: number, day: number) => { success: boolean; age: number };
  decline: () => void;
  reset: () => void;
}

const AgeVerificationContext = createContext<AgeVerificationContextType | null>(null);

export function calculateAge(year: number, month: number, day: number): number {
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age--;
  }
  return age;
}

export function AgeVerificationProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const record: AgeRecord = JSON.parse(data);
          const age = calculateAge(record.birthYear, record.birthMonth, record.birthDay);
          if (age >= LEGAL_DRINKING_AGE) {
            setIsVerified(true);
          }
        } catch {
          // ignore
        }
      }
      setIsLoading(false);
    });
  }, []);

  const verify = useCallback(
    (year: number, month: number, day: number) => {
      const age = calculateAge(year, month, day);
      if (age >= LEGAL_DRINKING_AGE) {
        const record: AgeRecord = {
          verifiedAt: new Date().toISOString(),
          birthYear: year,
          birthMonth: month,
          birthDay: day,
        };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
        setIsVerified(true);
        setDeclined(false);
        return { success: true, age };
      }
      setDeclined(true);
      return { success: false, age };
    },
    []
  );

  const decline = useCallback(() => {
    setDeclined(true);
    setIsVerified(false);
  }, []);

  const reset = useCallback(() => {
    AsyncStorage.removeItem(STORAGE_KEY);
    setIsVerified(false);
    setDeclined(false);
  }, []);

  return (
    <AgeVerificationContext.Provider
      value={{ isLoading, isVerified, declined, verify, decline, reset }}
    >
      {children}
    </AgeVerificationContext.Provider>
  );
}

export function useAgeVerification(): AgeVerificationContextType {
  const ctx = useContext(AgeVerificationContext);
  if (!ctx) throw new Error("useAgeVerification must be used within AgeVerificationProvider");
  return ctx;
}
