import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Auth Layout — bảo vệ các route /login, /register, /forgot-password.
 * Nếu đã có token trong localStorage → redirect về / ngay lập tức,
 * không render nội dung trang auth để tránh bị back về màn login.
 */
import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
export default function AuthLayout({
  children
}) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  // Keep auth routes on the same themed surface as the rest of the app.
  if (typeof document !== "undefined") {
    document.documentElement.style.backgroundColor = "";
    document.body.style.backgroundColor = "";
  }
  useEffect(() => {
    return () => {
      document.documentElement.style.backgroundColor = "";
      document.body.style.backgroundColor = "";
    };
  }, []);
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      navigate("/", {
        replace: true
      });
    } else {
      setReady(true);
    }
  }, [navigate]);

  // Khi chưa biết trạng thái login: hiện màn trắng thay vì null
  // để tránh body tối lộ ra phía sau
  if (!ready) {
    return /*#__PURE__*/_jsx("div", {
      style: {
        minHeight: "100dvh",
        backgroundColor: "var(--background)"
      },
      "aria-hidden": "true"
    });
  }
  return /*#__PURE__*/_jsx(_Fragment, {
    children: children
  });
}
