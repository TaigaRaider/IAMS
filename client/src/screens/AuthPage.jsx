import { BrandSide } from "../components/BrandSide";
import { AuthForm } from "../components/AuthForm";
import "./Auth.css";

export const AuthPage = ({ mode }) => {
  return (
    <section
      className={`entry-page ${mode === "login" ? "login-page" : "signup-page"}`}
    >
      <BrandSide />
      <AuthForm mode={mode} />
    </section>
  );
};
