import { useState, useEffect } from "react";
import {
  Users,
  PlayCircle,
  Clock,
  ShieldAlert,
  Search,
  Lock,
} from "lucide-react";
import "./Dashboard.css";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStreams: 0,
    listeningHours: 0,
  });
  const [topSongs, setTopSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [statsRes, songsRes] = await Promise.all([
          fetch("https://groove-api-three.vercel.app/api/admin/stats").then(
            (res) => res.json(),
          ),
          fetch("https://groove-api-three.vercel.app/api/admin/top-songs").then(
            (res) => res.json(),
          ),
        ]);

        setStats(statsRes);
        setTopSongs(songsRes);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load admin data");
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (loading) {
    return <div className="admin-loader-container">Loading Groove HQ...</div>;
  }

  return (
    <div className="groove-admin">
      <header className="groove-header">
        <h1 className="groove-title">Groove HQ</h1>
        <p className="groove-subtitle">Platform Analytics & User Management</p>
      </header>

      {/* Top Level Stat Cards */}
      <div className="stats-grid">
        <StatCard
          icon={<Users size={24} />}
          title="Total Users"
          value={stats.totalUsers}
        />
        <StatCard
          icon={<PlayCircle size={24} />}
          title="Total Streams"
          value={stats.totalStreams}
        />
        <StatCard
          icon={<Clock size={24} />}
          title="Hours Streamed"
          value={stats.listeningHours}
        />
      </div>

      <div className="content-grid">
        {/* Top Songs Table */}
        <div className="glass-panel">
          <h2 className="panel-header">
            <PlayCircle size={22} color="#fca311" /> Most Played Tracks
          </h2>
          <div className="song-list">
            {topSongs.map((song, idx) => (
              <div key={song._id} className="song-row">
                <div className="song-info">
                  <div className="song-title">
                    <span style={{ color: "#aaa", marginRight: "6px" }}>
                      {idx + 1}.
                    </span>
                    {song.title}
                  </div>
                  <div className="song-artist">{song.artist}</div>
                </div>
                <div className="song-plays">{song.plays}</div>
              </div>
            ))}
          </div>
        </div>

        {/* User Management Section */}
        <div className="glass-panel">
          <h2 className="panel-header">
            <ShieldAlert size={22} color="#e63946" /> Account Management
          </h2>

          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search users by email..."
              className="groove-input"
            />
          </div>

          {/* Placeholder for User Results */}
          <div className="song-list">
            <div className="song-row">
              <div className="song-info">
                <div className="song-title">testuser@example.com</div>
                <div className="song-artist">Status: Active</div>
              </div>
              <button className="split-pill-btn">
                <div className="split-pill-icon">
                  <Lock size={14} color="#fff" />
                </div>
                <div className="split-pill-text">Restrict</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Internal Stat Card Component
function StatCard({ icon, title, value }) {
  return (
    <div className="glass-panel stat-card">
      <div className="stat-icon-wrapper">{icon}</div>
      <div>
        <div className="stat-label">{title}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}
