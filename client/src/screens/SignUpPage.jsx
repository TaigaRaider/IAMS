import { SignUpForm } from "../components/SignUpForm";
import { BrandSide } from "../components/BrandSide";

export const SignUpPage = () => {
  return (
    <section className="page signup-page">
      <BrandSide />
      <SignUpForm />
    </section>
  );
};
