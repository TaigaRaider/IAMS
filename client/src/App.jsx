import { useState } from "react";
import { Bell, LayoutDashboard, Users, Briefcase, Plus, Menu } from "lucide-react";
import "./App.css";

function App() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <header>
        <button
          className="menu-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          <Menu />
        </button>
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
      <div className="layout">
        <aside className={collapsed ? "sidebar collapsed" : "sidebar"}>
          <nav>
            <button className="nav-item active">
              <LayoutDashboard />
              <span>Dashboard</span>
            </button>
            <button className="nav-item">
              <Users />
              <span>Candidates</span>
            </button>
            <button className="nav-item">
              <Briefcase />
              <span>Offers</span>
            </button>
            <button className="nav-item">
              <Plus />
              <span>Add</span>
            </button>
          </nav>
        </aside>
        <main className="content">
          <div className="intcards">
            <div className="intcard1">
              <p>Total Applications</p>
              <h1>15</h1>
            </div>
            <div className="intcard2">
              <p>Open Roles</p>
              <h1>8</h1>
            </div>
            <div className="intcard3">
              <p>Pending Interviews</p>
              <h1>5</h1>
            </div>
            <div className="intcard4">
              <p>Offers Extended</p>
              <h1>3</h1>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default App;
