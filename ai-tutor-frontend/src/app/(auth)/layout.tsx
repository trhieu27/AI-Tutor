"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Auth Layout — bảo vệ các route /login, /register, /forgot-password.
 * Nếu đã có token trong localStorage → redirect về / ngay lập tức,
 * không render nội dung trang auth để tránh bị back về màn login.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Áp dụng nền trắng NGAY lập tức trước khi bất kỳ effect nào chạy
  // tránh flash đen do dark theme của body/html
  if (typeof document !== "undefined") {
    document.documentElement.style.backgroundColor = "#ffffff";
    document.body.style.backgroundColor = "#ffffff";
  }

  useEffect(() => {
    // Force white on mount và cleanup khi rời trang auth
    document.documentElement.style.backgroundColor = "#ffffff";
    document.body.style.backgroundColor = "#ffffff";
    return () => {
      document.documentElement.style.backgroundColor = "";
      document.body.style.backgroundColor = "";
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      router.replace("/");
    } else {
      setReady(true);
    }
  }, [router]);

  // Khi chưa biết trạng thái login: hiện màn trắng thay vì null
  // để tránh body tối lộ ra phía sau
  if (!ready) {
    return (
      <div
        style={{ minHeight: "100dvh", backgroundColor: "#ffffff" }}
        aria-hidden="true"
      />
    );
  }

  return <>{children}</>;
}
