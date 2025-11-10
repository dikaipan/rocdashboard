/**
 * Generic CRUD operations hook
 * Reusable hook for Create, Read, Update, Delete operations
 */
import { useState, useCallback } from 'react';
import { batchedDispatchEvent } from '../utils/eventBatching';

/**
 * Generic CRUD hook
 * @param {Object} config - Configuration object
 * @param {string} config.endpoint - API endpoint base (e.g., '/api/engineers')
 * @param {string} config.primaryKey - Primary key field name (e.g., 'id', 'wsid')
 * @param {string} config.eventName - Custom event name to dispatch on data change
 * @returns {Object} CRUD operations and state
 */
export function useCrud(config) {
  const { endpoint, primaryKey = 'id', eventName = null } = config;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Create a new item
   */
  const create = useCallback(async (data) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create item');
      }

      const result = await response.json();

      // Dispatch custom event to refresh data
      if (eventName) {
        batchedDispatchEvent(eventName);
      }

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, eventName]);

  /**
   * Update an existing item
   */
  const update = useCallback(async (id, data) => {
    try {
      setLoading(true);
      setError(null);

      // Encode ID to handle special characters in URL (spaces, parentheses, plus signs, etc.)
      const encodedId = encodeURIComponent(id);

      const response = await fetch(`${endpoint}/${encodedId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update item');
      }

      const result = await response.json();

      // Dispatch custom event to refresh data only if there were actual changes
      // Skip refresh if no_changes flag is set (no changes detected on backend)
      if (eventName && !result.no_changes) {
        batchedDispatchEvent(eventName);
      }

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, eventName]);

  /**
   * Delete an item
   */
  const remove = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      // Encode ID to handle special characters in URL (spaces, parentheses, plus signs, etc.)
      const encodedId = encodeURIComponent(id);

      const response = await fetch(`${endpoint}/${encodedId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete item');
      }

      const result = await response.json();

      // Dispatch custom event to refresh data
      if (eventName) {
        batchedDispatchEvent(eventName);
      }

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, eventName]);

  /**
   * Bulk delete items
   */
  const bulkDelete = useCallback(async (ids) => {
    try {
      setLoading(true);
      setError(null);

      const results = await Promise.all(
        ids.map(id => {
          // Encode ID to handle special characters in URL
          const encodedId = encodeURIComponent(id);
          return fetch(`${endpoint}/${encodedId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          }).then(res => {
            if (!res.ok) {
              throw new Error(`Failed to delete item ${id}`);
            }
            return res.json();
          });
        })
      );

      // Dispatch custom event to refresh data
      if (eventName) {
        batchedDispatchEvent(eventName);
      }

      return results;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, eventName]);

  return {
    create,
    update,
    remove,
    bulkDelete,
    loading,
    error,
  };
}

