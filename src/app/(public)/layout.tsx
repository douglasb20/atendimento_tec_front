import React from 'react';
import { Metadata } from 'next';

interface FullPageLayoutProps {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: "Login",
};

export default function FullPageLayout({ children }: FullPageLayoutProps) {
  return <React.Fragment>{children}</React.Fragment>
}
