/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Activity,
  Settings,
  LogOut,
  RefreshCw,
  BarChart3,
  Search,
  Crown,
} from "lucide-react";
import "./Admin.css";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalStreams: 0,
    activeUsers: 0,
    topSong: "Loading...",
    serverStatus: "Checking...",
  });

  const [recentStreams, setRecentStreams] = useState([]);
  const [usersList, setUsersList] = useState([]);

  const timeAgo = (dateInput) => {
    const seconds = Math.floor((new Date() - new Date(dateInput)) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, recentRes, usersRes] = await Promise.all([
        fetch("https://groove-api-three.vercel.app/api/admin/stats"),
        fetch("https://groove-api-three.vercel.app/api/admin/recent"),
        fetch("https://groove-api-three.vercel.app/api/admin/users"),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (recentRes.ok) setRecentStreams(await recentRes.json());
      if (usersRes.ok) setUsersList(await usersRes.json());
    } catch (error) {
      console.error("Failed to fetch admin data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    // Optional: add real logout logic here later
    navigate("/home");
  };

  return (
    <div className="admin-container">
      {/* SIDEBAR / BOTTOM NAV */}
      <nav className="admin-sidebar">
        <div className="admin-logo">
          <BarChart3 size={28} color="#1DB954" />
          <span>GrooveOS</span>
        </div>

        <div
          className={`admin-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          <LayoutDashboard size={22} />{" "}
          <span className="nav-label">Overview</span>
        </div>
        <div
          className={`admin-nav-item ${activeTab === "streams" ? "active" : ""}`}
          onClick={() => setActiveTab("streams")}
        >
          <Activity size={22} /> <span className="nav-label">Live Feed</span>
        </div>
        <div
          className={`admin-nav-item ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          <Users size={22} /> <span className="nav-label">Audience</span>
        </div>

        <div className="spacer"></div>

        <div
          className="admin-nav-item"
          style={{ color: "#ef4444" }}
          onClick={handleLogout}
        >
          <LogOut size={22} /> <span className="nav-label">Exit Admin</span>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="admin-main">
        {/* 🔥 TAB 1: DASHBOARD (Overview) */}
        {activeTab === "dashboard" && (
          <div className="fade-in">
            <header
              className="admin-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "40px",
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "2.5rem",
                    fontWeight: 800,
                    letterSpacing: "-1px",
                  }}
                >
                  Platform Overview
                </h1>
                <p
                  style={{
                    margin: "6px 0 0 0",
                    color: "#888",
                    fontSize: "1rem",
                  }}
                >
                  Real-time telemetry and database analytics.
                </p>
              </div>
              <button
                onClick={fetchAdminData}
                style={{
                  background: "#fff",
                  border: "none",
                  color: "#000",
                  padding: "12px 20px",
                  borderRadius: "50px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "700",
                  boxShadow: "0 4px 15px rgba(255,255,255,0.1)",
                }}
              >
                <RefreshCw
                  size={18}
                  className={loading ? "spin-animation" : ""}
                />{" "}
                Sync Data
              </button>
            </header>

            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <h3>Global Streams</h3>
                <span className="stat-value">
                  {stats.totalStreams.toLocaleString()}
                </span>
              </div>
              <div className="admin-stat-card">
                <h3>Active Users (24h)</h3>
                <span className="stat-value">{stats.activeUsers}</span>
              </div>
              <div className="admin-stat-card">
                <h3>#1 Trending</h3>
                <span
                  className="stat-value"
                  style={{
                    fontSize: "1.4rem",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color: "#1DB954",
                    display: "block",
                    marginTop: "10px",
                  }}
                >
                  {stats.topSong}
                </span>
              </div>
            </div>

            <div className="admin-data-section">
              <div className="admin-panel-card">
                <h2
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    paddingBottom: "20px",
                    margin: "0 0 10px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <Activity size={20} color="#1DB954" /> Recent Activity
                </h2>
                <div className="admin-list-container">
                  {recentStreams.slice(0, 5).map((stream) => (
                    <div key={stream._id} className="admin-list-item">
                      <div
                        className="stream-info"
                        style={{
                          flex: 1,
                          display: "flex",
                          gap: "15px",
                          alignItems: "center",
                        }}
                      >
                        <img
                          src={
                            stream.albumArt ||
                            "https://c.saavncdn.com/default_album.jpg"
                          }
                          alt="album"
                          style={{
                            borderRadius: "8px",
                            width: "45px",
                            height: "45px",
                            objectFit: "cover",
                          }}
                        />
                        <div className="stream-details">
                          <h4
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              margin: "0 0 4px 0",
                              fontSize: "1rem",
                            }}
                          >
                            {stream.songTitle}
                          </h4>
                          <p
                            style={{
                              margin: 0,
                              color: "#888",
                              fontSize: "0.85rem",
                            }}
                          >
                            {stream.artistName}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            color: "#000",
                            background: "#1DB954",
                            padding: "4px 10px",
                            borderRadius: "100px",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            display: "inline-block",
                            marginBottom: "6px",
                          }}
                        >
                          @{stream.userName?.split(" ")[0] || "Guest"}
                        </div>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "#666",
                            margin: 0,
                          }}
                        >
                          {timeAgo(stream.lastPlayed)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-panel-card">
                <h2
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    paddingBottom: "20px",
                    margin: "0 0 20px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <Settings size={20} /> Quick Actions
                </h2>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <button className="admin-action-btn primary">
                    Generate "Wrapped" Data
                  </button>
                  <button className="admin-action-btn secondary">
                    Flush Database Cache
                  </button>
                  <button className="admin-action-btn danger">
                    Restrict Active User
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🔥 TAB 2: LIVE FEED (Full Page) */}
        {activeTab === "streams" && (
          <div className="fade-in">
            <header className="admin-header" style={{ marginBottom: "40px" }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "2.5rem",
                  fontWeight: 800,
                  letterSpacing: "-1px",
                }}
              >
                Global Feed
              </h1>
              <p style={{ margin: "6px 0 0 0", color: "#888" }}>
                A live ledger of every track being played right now.
              </p>
            </header>

            <div className="admin-panel-card">
              <div className="admin-list-container">
                {recentStreams.length === 0 ? (
                  <p
                    style={{
                      color: "#888",
                      textAlign: "center",
                      padding: "40px 0",
                    }}
                  >
                    No streaming data available.
                  </p>
                ) : (
                  recentStreams.map((stream) => (
                    <div
                      key={stream._id}
                      className="admin-list-item"
                      style={{ padding: "20px 10px" }}
                    >
                      <div
                        className="stream-info"
                        style={{
                          flex: 1,
                          display: "flex",
                          gap: "20px",
                          alignItems: "center",
                        }}
                      >
                        <img
                          src={
                            stream.albumArt ||
                            "https://c.saavncdn.com/default_album.jpg"
                          }
                          alt="album"
                          style={{
                            borderRadius: "8px",
                            width: "55px",
                            height: "55px",
                            boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
                          }}
                        />
                        <div className="stream-details">
                          <h4
                            style={{
                              fontSize: "1.1rem",
                              margin: "0 0 6px 0",
                              fontWeight: "700",
                            }}
                          >
                            {stream.songTitle}
                          </h4>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.9rem",
                              color: "#888",
                            }}
                          >
                            {stream.artistName}
                          </p>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "0 20px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "1.2rem",
                            fontWeight: "800",
                            color: "#fff",
                          }}
                        >
                          {stream.playCount}
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "#888",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                          }}
                        >
                          Plays
                        </span>
                      </div>

                      <div style={{ textAlign: "right", minWidth: "120px" }}>
                        <div
                          style={{
                            color: "#000",
                            background: "#1DB954",
                            padding: "4px 12px",
                            borderRadius: "100px",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                            display: "inline-block",
                            marginBottom: "8px",
                          }}
                        >
                          @{stream.userName?.split(" ")[0] || "Guest"}
                        </div>
                        <p
                          style={{
                            fontSize: "0.8rem",
                            color: "#666",
                            margin: 0,
                          }}
                        >
                          {timeAgo(stream.lastPlayed)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 🔥 TAB 3: USERS LEADERBOARD */}
        {activeTab === "users" && (
          <div className="fade-in">
            <header
              className="admin-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "40px",
                flexWrap: "wrap",
                gap: "20px",
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "2.5rem",
                    fontWeight: 800,
                    letterSpacing: "-1px",
                  }}
                >
                  Audience
                </h1>
                <p style={{ margin: "6px 0 0 0", color: "#888" }}>
                  Your top listeners ranked by total streams.
                </p>
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.05)",
                  padding: "10px 20px",
                  borderRadius: "100px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <Search size={18} color="#888" />
                <input
                  type="text"
                  placeholder="Search by ID or Name..."
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#fff",
                    outline: "none",
                    fontSize: "0.95rem",
                    width: "200px",
                  }}
                />
              </div>
            </header>

            <div className="admin-panel-card">
              {usersList.length === 0 ? (
                <p
                  style={{
                    color: "#888",
                    textAlign: "center",
                    padding: "60px 0",
                  }}
                >
                  No active audience data.
                </p>
              ) : (
                usersList.map((usr, index) => (
                  <div
                    key={usr._id}
                    className="admin-list-item"
                    style={{ padding: "20px 10px" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "20px",
                        flex: 1,
                      }}
                    >
                      {/* Leaderboard Position with Trophy for #1 */}
                      <div
                        style={{
                          width: "40px",
                          textAlign: "center",
                          display: "flex",
                          justifyContent: "center",
                        }}
                      >
                        {index === 0 ? (
                          <Crown size={28} color="#d4af37" />
                        ) : (
                          <span
                            style={{
                              color: "#666",
                              fontSize: "1.2rem",
                              fontWeight: "bold",
                            }}
                          >
                            #{index + 1}
                          </span>
                        )}
                      </div>

                      {/* User Avatar */}
                      <div
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "50%",
                          background:
                            index === 0
                              ? "linear-gradient(135deg, #d4af37, #f3e5ab)"
                              : "linear-gradient(135deg, #1DB954, #127a35)",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          fontWeight: "800",
                          fontSize: "1.4rem",
                          color: "#000",
                          boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                        }}
                      >
                        {usr.userName
                          ? usr.userName.charAt(0).toUpperCase()
                          : "G"}
                      </div>

                      <div>
                        <h4
                          style={{
                            margin: "0 0 6px 0",
                            fontSize: "1.15rem",
                            fontWeight: "700",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          {usr.userName || "Anonymous Guest"}
                          {index === 0 && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                background: "rgba(212, 175, 55, 0.2)",
                                color: "#d4af37",
                                padding: "2px 8px",
                                borderRadius: "100px",
                                textTransform: "uppercase",
                                letterSpacing: "1px",
                              }}
                            >
                              Top Listener
                            </span>
                          )}
                        </h4>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.8rem",
                            color: "#666",
                            fontFamily: "monospace",
                          }}
                        >
                          ID: {usr._id}
                        </p>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: "800",
                          color: "#fff",
                          marginBottom: "4px",
                          letterSpacing: "-0.5px",
                        }}
                      >
                        {usr.totalPlays.toLocaleString()}{" "}
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "#888",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                          }}
                        >
                          Streams
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: "#1DB954",
                          margin: 0,
                          fontWeight: "600",
                        }}
                      >
                        Last online {timeAgo(usr.lastActive)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
