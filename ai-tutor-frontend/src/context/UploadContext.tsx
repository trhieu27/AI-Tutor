// @refresh reset

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { uploadDocument } from '@/services/api.service';



const UploadContext = createContext(undefined);

export const UploadProvider = ({ children }) => {
  const [queue, setQueue] = useState([]);
  const [lastUploadTime, setLastUploadTime] = useState(0);

  const isAnyUploading = queue.some(item => item.status === "uploading" || item.status === "waiting");

  const removeFromQueue = useCallback((id) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const uploadFile = useCallback(async (id, file: File) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, status: "uploading" } : item));

    try {
      await uploadDocument(file);

      setQueue(prev => {
        const itemExists = prev.find(item => item.id === id);
        if (!itemExists) return prev;
        return prev.map(item => item.id === id ? { ...item, status: "success", progress: 100 } : item);
      });

      setLastUploadTime(Date.now());

      // Auto-remove success items after 5 seconds instead of 3 to give more time to see success
      setTimeout(() => {
        setQueue(prev => prev.filter(item => item.id !== id));
      }, 5000);
    } catch (err) {
      console.error("Upload error for file:", file.name, err);
      setQueue(prev => {
        const itemExists = prev.find(item => item.id === id);
        if (!itemExists) return prev;
        return prev.map(item => item.id === id ? { ...item, status: "error" } : item);
      });
    }
  }, []);

  const addToQueue = useCallback(async (files) => {
    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    const newItems = [];

    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (allowedTypes.includes((file as File).type)) {
        newItems.push({
          id: Math.random().toString(36).substr(2, 9) + Date.now(),
          file,
          status: "waiting",
          progress: 0
        });
      }
    }

    if (newItems.length === 0) return;

    setQueue(prev => [...prev, ...newItems]);

    // We don't await the whole loop here because we want them to start in background
    // and let the context stay responsive
    const startUploads = async () => {
      for (const item of newItems) {
        await uploadFile(item.id, item.file);
      }
    };

    startUploads();
  }, [uploadFile]);

  return (
    <UploadContext.Provider value={{
      queue,
      addToQueue,
      removeFromQueue,
      isAnyUploading,
      clearQueue,
      lastUploadTime
    }}>
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};
