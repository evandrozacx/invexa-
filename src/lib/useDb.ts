import { useState, useEffect, useCallback } from "react";
import { Company, Operator, Device, Inventory } from "../types";

export function useDb() {
  const [data, setData] = useState<{
    companies: Company[];
    operators: Operator[];
    devices: Device[];
    inventories: Inventory[];
  }>({ companies: [], operators: [], devices: [], inventories: [] });
  
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [compRes, opRes, devRes, invRes] = await Promise.all([
        fetch("/api/companies").catch(() => null),
        fetch("/api/operators").catch(() => null),
        fetch("/api/devices").catch(() => null),
        fetch("/api/inventories").catch(() => null),
      ]);

      const companies = compRes && compRes.ok ? await compRes.json() : null;
      const operators = opRes && opRes.ok ? await opRes.json() : null;
      const devices = devRes && devRes.ok ? await devRes.json() : null;
      const inventories = invRes && invRes.ok ? await invRes.json() : null;

      setData(prev => ({
        companies: companies !== null ? companies : prev.companies,
        operators: operators !== null ? operators : prev.operators,
        devices: devices !== null ? devices : prev.devices,
        inventories: inventories !== null ? inventories : prev.inventories
      }));
    } catch (err) {
      console.error("Error fetching data from API:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    
    // Auto-refresh interval (polling) to keep dashboard live (every 10 seconds)
    const interval = setInterval(() => {
      fetchAll();
    }, 10000);

    // Refresh immediately on manual trigger
    const handleUpdate = () => fetchAll();
    window.addEventListener("invexa-db-updated", handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("invexa-db-updated", handleUpdate);
    };
  }, [fetchAll]);

  return { db: data, loading, refetch: fetchAll };
}
