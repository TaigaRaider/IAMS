import "./LoadingScreen.css";

export default function LoadingScreen({ text = "Loading..." }) {
  return (
    <div className="loading-screen">
      <img src="/iamslogo.png" alt="IAMS" className="loading-logo" />
      <div className="loading-spinner" aria-hidden="true" />
      <p className="loading-text">{text}</p>
    </div>
  );
}