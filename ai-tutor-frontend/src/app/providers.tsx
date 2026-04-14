'use client';

import { AuthProvider } from '@/context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

export function Providers({ children }: { children: React.ReactNode }) {
  // Thay thế bằng Client ID thực tế của bạn từ Google Cloud Console
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "801791613238-tqiu8qenj6uqitun0qv3emr7lda965eo.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
