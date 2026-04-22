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

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      // Đã login → về dashboard, replace để không quay lại được bằng nút Back
      router.replace("/");
    } else {
      setReady(true);
    }
  }, [router]);

  // Chờ cho đến khi biết chắc chưa login mới render form
  if (!ready) return null;

  return <>{children}</>;
}
