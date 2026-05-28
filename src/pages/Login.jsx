import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  useEffect(() => {
    if (localStorage.getItem("groove_token")) {
      navigate("/home", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        "https://groove-7xpvwjxx0-dikshants-projects-9f5680cd.vercel.app/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.msg || "Failed to login");

      localStorage.setItem("groove_token", data.token);

      localStorage.setItem("groove_user", JSON.stringify(data.user));

      navigate("/home", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-container fade-in">
      <h2 style={{ fontSize: "2.5rem", marginBottom: "10px", color: "green" }}>
        Welcome Back
      </h2>
      <p className="subtitle">Pick up where you left off.</p>

      {/* Error Display */}
      {error && (
        <div
          style={{
            color: "#ff6b6b",
            background: "rgba(255,107,107,0.1)",
            padding: "10px",
            borderRadius: "8px",
            marginBottom: "20px",
            border: "1px solid #ff6b6b",
          }}
        >
          {error}
        </div>
      )}

      <form className="login-form" onSubmit={handleLogin}>
        <input
          type="email"
          name="email"
          placeholder="Email address"
          className="input-glass"
          value={formData.email}
          onChange={handleChange}
          required
          autoComplete="email"
        />

        <div style={{ position: "relative", width: "100%" }}>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            className="input-glass"
            style={{ width: "100%" }}
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "15px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "#8a817a",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{ marginTop: "20px" }}
        >
          {loading ? "Authenticating..." : "Listen Now"}
        </button>
      </form>

      <button
        className="btn-text"
        onClick={() => navigate("/register")}
        disabled={loading}
      >
        Don't have an account? Request access
      </button>
    </div>
  );
}
