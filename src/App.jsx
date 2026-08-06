import { useState } from "react";
import { Bell } from "lucide-react";
import "./App.css";

function App() {
  return (
    <>
      <header>
        <img src="/iamslogo.png" alt="Logo" className="logo" />
        <input type="text" placeholder="Search..." />
        <div className="actions">
          <Bell className="bell" />
          <svg className="avatar" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="24" r="14" fill="#f0e6ff" />
            <path d="M10 58c4-14 12-18 22-18s18 4 22 18" fill="#f0e6ff" />
          </svg>
        </div>
      </header>
      <div className="intcards">
        <p>Welcome to the IAMS App</p>
      </div>
    </>
  );
}

export default App;
