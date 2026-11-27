import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Disc3, DownloadCloud, Headphones, Mic2 } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("groove_token")) {
      navigate("/home", { replace: true });
    }
  }, [navigate]);

  return (
    <div
      className="screen-container fade-in"
      style={{
        minHeight: "100dvh",
        justifyContent: "center",
        padding: "40px 24px",
        background:
          "radial-gradient(circle at 50% 10%, rgba(29, 185, 84, 0.14) 0%, rgba(255, 229, 182, 0.06) 35%, #110f0d 75%)",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 22,
          background: "linear-gradient(135deg, #ffe5b6 0%, #1db954 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          boxShadow: "0 16px 40px rgba(29, 185, 84, 0.28)",
        }}
      >
        <Disc3 size={38} color="#110f0d" strokeWidth={2.2} />
      </div>

      <span
        style={{
          fontSize: "0.72rem",
          letterSpacing: "2.4px",
          textTransform: "uppercase",
          color: "#1db954",
          fontWeight: 800,
          marginBottom: 10,
        }}
      >
        High-Fidelity Audio Sanctuary
      </span>

      <h1 className="brand-title" style={{ marginBottom: 12 }}>
        Groove Music
      </h1>
      <p
        className="subtitle delay-1"
        style={{ maxWidth: 420, marginBottom: 30, lineHeight: 1.5 }}
      >
        Studio-grade streaming, synced live lyrics, and effortless offline &
        device downloads.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
          maxWidth: 440,
          width: "100%",
          marginBottom: 34,
        }}
      >
        {[
          { icon: <Headphones size={18} color="#ffe5b6" />, label: "320kbps Hi-Fi" },
          {
            icon: <DownloadCloud size={18} color="#1db954" />,
            label: "Device .m4a",
          },
          { icon: <Mic2 size={18} color="#ffe5b6" />, label: "Live Lyrics" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14,
              padding: "14px 8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#e6ddd5",
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          width: "100%",
        }}
      >
        <button
          className="btn-primary delay-2"
          onClick={() => navigate("/login")}
        >
          Sign In to Listen
        </button>
        <button
          className="btn-text"
          style={{ marginTop: 6 }}
          onClick={() => navigate("/register")}
        >
          Create a Groove Account
        </button>
      </div>
    </div>
  );
}
