// @refresh reset

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { fetchDocuments } from '@/shared/services/api.service';
import { useUpload } from './UploadContext';
import { jsx as _jsx } from "react/jsx-runtime";

const DocumentContext = /*#__PURE__*/createContext(undefined);

export const DocumentProvider = ({
  children
}) => {
  // ── Library table state ──
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1, limit: 5, total: 0, totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  
  const [filters, setFilters] = useState({
    page: 1, limit: 5, search: "", status: "all", sort: "recent",
  });

  const { lastUploadTime } = useUpload();

  // Refs to avoid stale closures
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Core library fetch
  const fetchRef = useRef(0);
  const libraryReadyRef = useRef(false);

  const doFetch = useCallback(async (filterValues) => {
    const id = ++fetchRef.current;
    try {
      const res = await fetchDocuments({
        page: filterValues.page,
        limit: filterValues.limit,
        search: filterValues.search,
        status: filterValues.status,
        sort: filterValues.sort,
      });
      if (id === fetchRef.current) {
        setDocuments(res.items || []);
        setPagination(res.pagination || { page: 1, limit: filterValues.limit, total: 0, totalPages: 1 });
        setLastRefreshTime(Date.now());
        libraryReadyRef.current = true;
      }
    } catch (err) {
      if (id === fetchRef.current) {
        console.error("Failed to fetch documents:", err);
        setError("Không thể tải danh sách tài liệu.");
      }
    } finally {
      if (id === fetchRef.current) {
        setLoading(false);
        setFetching(false);
      }
    }
  }, []);

  // refreshDocuments for external callers (polling, upload)
  const refreshDocuments = useCallback(async () => {
    await doFetch(filtersRef.current);
  }, [doFetch]);

  // Initial load + filter changes — only dim after first load
  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    if (libraryReadyRef.current) {
      setFetching(true);
    }
    doFetch(filters);
  }, [filtersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Picker state (persists across tab navigation) ──
  const [pickerDocuments, setPickerDocuments] = useState([]);
  const [pickerPagination, setPickerPagination] = useState({
    page: 1, limit: 5, total: 0, totalPages: 1,
  });
  const [pickerLoading, setPickerLoading] = useState(true);
  const [pickerFetching, setPickerFetching] = useState(false);
  const [pickerFilters, setPickerFilters] = useState({
    page: 1, limit: 5, search: "", showOnlyReady: true,
  });

  // Ref for picker filters (avoid stale closure in upload effect)
  const pickerFiltersRef = useRef(pickerFilters);
  pickerFiltersRef.current = pickerFilters;

  const pickerFetchRef = useRef(0);
  const pickerReadyRef = useRef(false);

  const doPickerFetch = useCallback(async (pf) => {
    const id = ++pickerFetchRef.current;
    try {
      const res = await fetchDocuments({
        page: pf.page,
        limit: pf.limit,
        search: pf.search,
        status: pf.showOnlyReady ? "READY" : undefined,
        sort: "recent",
        withPagination: true,
      });
      if (id === pickerFetchRef.current) {
        setPickerDocuments(res.items || []);
        setPickerPagination(res.pagination || { page: 1, limit: pf.limit, total: 0, totalPages: 1 });
        pickerReadyRef.current = true;
      }
    } catch (err) {
      if (id === pickerFetchRef.current) {
        console.error("Failed to fetch picker documents:", err);
      }
    } finally {
      if (id === pickerFetchRef.current) {
        setPickerLoading(false);
        setPickerFetching(false);
      }
    }
  }, []);

  const refreshPicker = useCallback(async () => {
    await doPickerFetch(pickerFiltersRef.current);
  }, [doPickerFetch]);

  // Initial + filter changes — only dim after first load
  const pickerFiltersKey = JSON.stringify(pickerFilters);
  useEffect(() => {
    if (pickerReadyRef.current) {
      setPickerFetching(true);
    }
    doPickerFetch(pickerFilters);
  }, [pickerFiltersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto refresh on upload (skip mount) — uses refs for latest filters
  const prevUploadTime = useRef(lastUploadTime);
  useEffect(() => {
    if (lastUploadTime > 0 && lastUploadTime !== prevUploadTime.current) {
      prevUploadTime.current = lastUploadTime;
      doFetch(filtersRef.current);
      doPickerFetch(pickerFiltersRef.current);
    }
  }, [lastUploadTime, doFetch, doPickerFetch]);

  return /*#__PURE__*/_jsx(DocumentContext.Provider, {
    value: {
      // Library
      documents,
      pagination,
      loading,
      fetching,
      error,
      filters,
      setFilters,
      refreshDocuments,
      lastRefreshTime,
      // Picker
      pickerDocuments,
      pickerPagination,
      pickerLoading,
      pickerFetching,
      pickerFilters,
      setPickerFilters,
      refreshPicker,
    },
    children: children
  });
};

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};