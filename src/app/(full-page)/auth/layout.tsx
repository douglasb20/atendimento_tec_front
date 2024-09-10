import { AuthProvider } from 'contexts/AuthContext';

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return <AuthProvider>{children}</AuthProvider>;
};

export default AuthLayout;
