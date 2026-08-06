import { LoginForm } from "../components/LoginForm";
import { BrandSide } from "../components/BrandSide";

export const LoginPage = () => {
  return (
    <section className="page login-page">
      <BrandSide />
      <LoginForm />
    </section>
  );
};
