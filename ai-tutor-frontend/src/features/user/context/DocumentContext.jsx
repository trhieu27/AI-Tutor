// @refresh reset — Vite HMR: reset context state to avoid stale document lists

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { fetchDocuments } from '@/shared/services/api.service';
import { useUpload } from './UploadContext';

const DocumentContext = createContext(undefined);

/**
 * Provider quản lý danh sách tài liệu (thư viện + picker).
 * Tự động fetch lại khi upload xong hoặc document xử lý xong.
 */
export const DocumentProvider = ({
  children
}) => {
  // Trạng thái bảng thư viện chính
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

  const { lastUploadTime, lastDocReadyTime } = useUpload();

  // Ref giữ filters mới nhất, tránh stale closure trong callback
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Fetch thư viện — dùng fetchId để bỏ qua response cũ
  const fetchRef = useRef(0);
  const libraryReadyRef = useRef(false);

  const doFetch = useCallback(async (filterValues) => {
    const fetchId = ++fetchRef.current;
    try {
      const res = await fetchDocuments({
        page: filterValues.page,
        limit: filterValues.limit,
        search: filterValues.search,
        status: filterValues.status,
        sort: filterValues.sort,
      });
      if (fetchId === fetchRef.current) {
        setDocuments(res.items || []);
        setPagination(res.pagination || { page: 1, limit: filterValues.limit, total: 0, totalPages: 1 });
        setLastRefreshTime(Date.now());
        libraryReadyRef.current = true;
      }
    } catch (err) {
      if (fetchId === fetchRef.current) {
        console.error("Failed to fetch documents:", err);
        setError("Không thể tải danh sách tài liệu.");
      }
    } finally {
      if (fetchId === fetchRef.current) {
        setLoading(false);
        setFetching(false);
      }
    }
  }, []);

  // Refresh từ bên ngoài (polling, sau upload)
  const refreshDocuments = useCallback(async () => {
    await doFetch(filtersRef.current);
  }, [doFetch]);

  // Fetch khi filter thay đổi — chỉ hiển thị fetching sau lần đầu
  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    if (libraryReadyRef.current) {
      setFetching(true);
    }
    doFetch(filters);
  }, [filtersKey]); // eslint-disable-line react-hooks/exhaustive-deps — dùng filtersKey thay vì filters object để tránh re-fetch khi reference đổi nhưng giá trị giống

  // Trạng thái Picker (giữ nguyên khi chuyển tab)
  const [pickerDocuments, setPickerDocuments] = useState([]);
  const [pickerPagination, setPickerPagination] = useState({
    page: 1, limit: 5, total: 0, totalPages: 1,
  });
  const [pickerLoading, setPickerLoading] = useState(true);
  const [pickerFetching, setPickerFetching] = useState(false);
  const [pickerFilters, setPickerFilters] = useState({
    page: 1, limit: 5, search: "", showOnlyReady: true,
  });

  // Ref giữ picker filters mới nhất, tránh stale closure
  const pickerFiltersRef = useRef(pickerFilters);
  pickerFiltersRef.current = pickerFilters;

  const pickerFetchRef = useRef(0);
  const pickerReadyRef = useRef(false);

  const doPickerFetch = useCallback(async (pickerFilterValues) => {
    const fetchId = ++pickerFetchRef.current;
    try {
      const res = await fetchDocuments({
        page: pickerFilterValues.page,
        limit: pickerFilterValues.limit,
        search: pickerFilterValues.search,
        status: pickerFilterValues.showOnlyReady ? "READY" : undefined,
        sort: "recent",
        withPagination: true,
      });
      if (fetchId === pickerFetchRef.current) {
        setPickerDocuments(res.items || []);
        setPickerPagination(res.pagination || { page: 1, limit: pickerFilterValues.limit, total: 0, totalPages: 1 });
        pickerReadyRef.current = true;
      }
    } catch (err) {
      if (fetchId === pickerFetchRef.current) {
        console.error("Failed to fetch picker documents:", err);
      }
    } finally {
      if (fetchId === pickerFetchRef.current) {
        setPickerLoading(false);
        setPickerFetching(false);
      }
    }
  }, []);

  const refreshPicker = useCallback(async () => {
    await doPickerFetch(pickerFiltersRef.current);
  }, [doPickerFetch]);

  // Fetch picker khi filter thay đổi — chỉ hiển thị fetching sau lần đầu
  const pickerFiltersKey = JSON.stringify(pickerFilters);
  useEffect(() => {
    if (pickerReadyRef.current) {
      setPickerFetching(true);
    }
    doPickerFetch(pickerFilters);
  }, [pickerFiltersKey]); // eslint-disable-line react-hooks/exhaustive-deps — tương tự filtersKey ở trên

  // Tự refresh khi upload xong (bỏ qua mount) — dùng ref cho filters mới nhất
  const prevUploadTime = useRef(lastUploadTime);
  useEffect(() => {
    if (lastUploadTime > 0 && lastUploadTime !== prevUploadTime.current) {
      prevUploadTime.current = lastUploadTime;
      doFetch(filtersRef.current);
      doPickerFetch(pickerFiltersRef.current);
    }
  }, [lastUploadTime, doFetch, doPickerFetch]);

  // Tự refresh khi tài liệu xử lý xong (WebSocket document_ready)
  const prevDocReadyTime = useRef(lastDocReadyTime);
  useEffect(() => {
    if (lastDocReadyTime > 0 && lastDocReadyTime !== prevDocReadyTime.current) {
      prevDocReadyTime.current = lastDocReadyTime;
      doFetch(filtersRef.current);
      doPickerFetch(pickerFiltersRef.current);
    }
  }, [lastDocReadyTime, doFetch, doPickerFetch]);

  return (
    <DocumentContext.Provider value={{
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
    }}>
      {children}
    </DocumentContext.Provider>
  );
};

/** Hook truy cập DocumentContext — phải dùng bên trong DocumentProvider */
export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};