// @refresh reset

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fetchDocuments } from '@/services/api.service';
import { useUpload } from './UploadContext';
import { jsx as _jsx } from "react/jsx-runtime";
const DocumentContext = /*#__PURE__*/createContext(undefined);
export const DocumentProvider = ({
  children
}) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const {
    lastUploadTime
  } = useUpload();
  const refreshDocuments = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError("");
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
      setLastRefreshTime(Date.now());
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      setError("Không thể tải danh sách tài liệu.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  // Auto refresh when a global upload finishes
  useEffect(() => {
    if (lastUploadTime > 0) {
      refreshDocuments(true); // Silent refresh
    }
  }, [lastUploadTime, refreshDocuments]);
  return /*#__PURE__*/_jsx(DocumentContext.Provider, {
    value: {
      documents,
      loading,
      error,
      refreshDocuments,
      lastRefreshTime
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