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

      const companies = compRes && compRes.ok ? await compRes.json() : [];
      const operators = opRes && opRes.ok ? await opRes.json() : [];
      const devices = devRes && devRes.ok ? await devRes.json() : [];
      const inventories = invRes && invRes.ok ? await invRes.json() : [];

      setData({ companies, operators, devices, inventories });
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
