import { APP_COLORS } from '@/constants/colors';
import { AUTH_TEXTS } from '@/constants/texts';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function AuthBranding() {
  return /*#__PURE__*/_jsxs("div", {
    className: "hidden lg:flex lg:w-1/2 text-white flex-col justify-between p-16 relative overflow-hidden",
    style: {
      backgroundColor: APP_COLORS.bgBrand
    },
    children: [/*#__PURE__*/_jsx("div", {
      className: "absolute top-[-10%] left-[-10%] w-125 h-125 rounded-full border border-white opacity-15"
    }), /*#__PURE__*/_jsx("div", {
      className: "absolute bottom-[20%] right-[-10%] w-150 h-150 rounded-full border border-white opacity-15"
    }), /*#__PURE__*/_jsx("div", {
      className: "absolute top-[40%] left-[20%] w-200 h-200 rounded-full border border-white opacity-15"
    }), /*#__PURE__*/_jsxs("div", {
      className: "relative z-10",
      children: [/*#__PURE__*/_jsxs("h1", {
        className: "text-2xl font-bold tracking-tight mb-20 text-white",
        children: [AUTH_TEXTS.LOGIN.HERO_TITLE, " "]
      }), /*#__PURE__*/_jsx("div", {
        className: "mb-8",
        children: /*#__PURE__*/_jsx("h2", {
          className: "text-[38px] font-bold leading-tight mb-8 max-w-lg text-white",
          children: AUTH_TEXTS.LOGIN.HERO_QUOTE
        })
      })]
    })]
  });
}