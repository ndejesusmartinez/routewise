import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import {
  fetchDashboardSummary,
  fetchOrders,
  fetchPlans,
  fetchVehicles
} from './api';
import type { DashboardSummary, Order, PlanSummary, Vehicle } from './types';

const API_URL_KEY = 'routewise.apiBaseUrl';
const emulatorDefault = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000';

interface WorkspaceValue {
  apiBaseUrl: string;
  dashboard: DashboardSummary | null;
  orders: Order[];
  vehicles: Vehicle[];
  plans: PlanSummary[];
  isLoading: boolean;
  error: string | null;
  setApiBaseUrl: (value: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [apiBaseUrl, setApiBaseUrlState] = useState(emulatorDefault);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedUrl, setHasLoadedUrl] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(API_URL_KEY)
      .then((savedUrl) => {
        if (savedUrl) {
          setApiBaseUrlState(savedUrl);
        }
        setHasLoadedUrl(true);
      })
      .catch((storageError: unknown) => {
        setError(storageError instanceof Error ? storageError.message : 'No se pudo leer la configuración local.');
        setHasLoadedUrl(true);
      });
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [nextDashboard, nextOrders, nextVehicles, nextPlans] = await Promise.all([
        fetchDashboardSummary(apiBaseUrl),
        fetchOrders(apiBaseUrl),
        fetchVehicles(apiBaseUrl),
        fetchPlans(apiBaseUrl)
      ]);
      setDashboard(nextDashboard);
      setOrders(nextOrders);
      setVehicles(nextVehicles);
      setPlans(nextPlans);
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : 'No se pudieron cargar los datos.';
      setError(message);
      throw refreshError;
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (hasLoadedUrl) {
      const timer = setTimeout(() => {
        void refresh().catch(() => undefined);
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [hasLoadedUrl, refresh]);

  const saveApiBaseUrl = useCallback(async (value: string) => {
    const normalized = value.trim().replace(/\/+$/, '');
    let parsed: URL;
    try {
      parsed = new URL(normalized);
    } catch {
      throw new Error('Escribe una URL válida, por ejemplo http://192.168.1.10:8000.');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('La URL de la API debe comenzar con http:// o https://.');
    }
    await AsyncStorage.setItem(API_URL_KEY, normalized);
    setApiBaseUrlState(normalized);
    setError(null);
  }, []);

  const value = useMemo<WorkspaceValue>(() => ({
    apiBaseUrl,
    dashboard,
    orders,
    vehicles,
    plans,
    isLoading,
    error,
    setApiBaseUrl: saveApiBaseUrl,
    refresh
  }), [apiBaseUrl, dashboard, orders, vehicles, plans, isLoading, error, saveApiBaseUrl, refresh]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace debe usarse dentro de WorkspaceProvider.');
  }
  return context;
}
