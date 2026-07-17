// @refresh reset — Vite HMR: reset context state to avoid stale upload queue

import { createContext, useContext, useState, useCallback } from 'react';
import { uploadDocument } from '@/shared/services/api.service';
import { ALLOWED_UPLOAD_TYPES } from '@/shared/constants/uploadConstants';
import { generateUniqueId } from '@/shared/utils/idUtils';

const UploadContext = createContext(undefined);

/**
 * Provider quản lý hàng đợi upload tài liệu.
 * Tự động xóa file đã upload thành công sau 5 giây.
 */
export const UploadProvider = ({
  children
}) => {
  const [queue, setQueue] = useState([]);
  const [lastUploadTime, setLastUploadTime] = useState(0);
  const [lastDocReadyTime, setLastDocReadyTime] = useState(0);
  const isAnyUploading = queue.some(item => item.status === "uploading" || item.status === "waiting");
  const removeFromQueue = useCallback(id => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);
  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);
  const uploadFile = useCallback(async (id, file) => {
    setQueue(prev => prev.map(item => item.id === id ? {
      ...item,
      status: "uploading"
    } : item));
    try {
      await uploadDocument(file);
      setQueue(prev => {
        const itemExists = prev.find(item => item.id === id);
        if (!itemExists) return prev;
        return prev.map(item => item.id === id ? {
          ...item,
          status: "success",
          progress: 100
        } : item);
      });
      setLastUploadTime(Date.now());

      // Xóa file thành công khỏi queue sau 5s (đủ thời gian hiển thị trạng thái)
      setTimeout(() => {
        setQueue(prev => prev.filter(item => item.id !== id));
      }, 5000);
    } catch (err) {
      console.error("Upload error for file:", file.name, err);
      setQueue(prev => {
        const itemExists = prev.find(item => item.id === id);
        if (!itemExists) return prev;
        return prev.map(item => item.id === id ? {
          ...item,
          status: "error",
          error: err.message || "Upload thất bại"
        } : item);
      });
    }
  }, []);
  const addToQueue = useCallback(async files => {
    const newItems = [];
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      if (ALLOWED_UPLOAD_TYPES.includes(file.type)) {
        newItems.push({
          id: generateUniqueId(),
          file,
          status: "waiting",
          progress: 0
        });
      }
    }
    if (newItems.length === 0) return;
    setQueue(prev => [...prev, ...newItems]);

    // Khởi động upload tuần tự trong background, không chặn UI
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
      lastUploadTime,
      lastDocReadyTime,
      notifyDocReady: () => setLastDocReadyTime(Date.now()),
    }}>
      {children}
    </UploadContext.Provider>
  );
};

/** Hook truy cập UploadContext — phải dùng bên trong UploadProvider */
export const useUpload = () => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};