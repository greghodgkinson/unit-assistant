import { useState, useEffect } from 'react';
import { Unit } from '../types/Unit';

export const useUnitData = () => {
  const [unitData, setUnitData] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUnitData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/unit-1.json');
        if (!response.ok) {
          throw new Error(`Failed to load unit data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setUnitData(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load unit data';
        setError(errorMessage);
        console.error('Error loading unit data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUnitData();
  }, []);

  return { unitData, loading, error };
};