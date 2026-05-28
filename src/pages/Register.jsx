import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [otp, setOtp] = useState("");

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  // Step 1: Request the Code
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (formData.password.length < 6)
      return setError("Password must be at least 6 characters.");

    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://127.0.0.1:5000/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Failed to send code");

      // Success! Open the modal
      setShowModal(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify the Code
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        "https://groove-j2szeaw7j-dikshants-projects-9f5680cd.vercel.app/api/auth/verify-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, otp }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Verification failed");

      // Log them in immediately
      localStorage.setItem("groove_token", data.token);
      localStorage.setItem("groove_user", JSON.stringify(data.user));
      navigate("/search");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-container fade-in" style={{ position: "relative" }}>
      <h2 style={{ fontSize: "2.5rem", marginBottom: "10px" }}>
        Join the Club
      </h2>
      <p className="subtitle">Curated audio awaits.</p>

      {error && !showModal && (
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

      {/* Main Registration Form */}
      <form className="login-form fade-in" onSubmit={handleRequestOtp}>
        <input
          type="text"
          name="name"
          placeholder="How should we call you?"
          className="input-glass"
          value={formData.name}
          onChange={handleChange}
          required
          disabled={showModal}
        />
        <input
          type="email"
          name="email"
          placeholder="Your Email Address"
          className="input-glass"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={showModal}
        />
        <input
          type="password"
          name="password"
          placeholder="Create a Password"
          className="input-glass"
          value={formData.password}
          onChange={handleChange}
          required
          disabled={showModal}
        />

        <button
          type="submit"
          className="btn-primary"
          disabled={loading || showModal}
          style={{ marginTop: "10px" }}
        >
          {loading ? "Preparing..." : "Send Access Code"}
        </button>
      </form>

      <button
        className="btn-text"
        onClick={() => navigate("/login")}
        disabled={loading || showModal}
      >
        Already have an account? Sign in
      </button>

      {/* OTP Verification Modal */}
      {showModal && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(17, 15, 13, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 50,
          }}
          className="fade-in"
        >
          <div
            style={{
              background: "#1c1917",
              padding: "40px 30px",
              borderRadius: "16px",
              border: "1px solid #3d3632",
              maxWidth: "320px",
              width: "90%",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <h3 style={{ marginBottom: "10px", color: "#ffe5b6" }}>
              Verify Your Email
            </h3>
            <p
              style={{
                fontSize: "0.9rem",
                color: "#a89f98",
                marginBottom: "20px",
              }}
            >
              We sent a 6-digit code to <strong>{formData.email}</strong>
            </p>

            {error && (
              <p
                style={{
                  color: "#ff6b6b",
                  fontSize: "0.9rem",
                  marginBottom: "15px",
                }}
              >
                {error}
              </p>
            )}

            <form
              onSubmit={handleVerifyOtp}
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <input
                type="text"
                placeholder="0 0 0 0 0 0"
                className="input-glass"
                style={{
                  textAlign: "center",
                  letterSpacing: "8px",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                }}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} // Force numbers only
                maxLength="6"
                required
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || otp.length < 6}
              >
                {loading ? "Verifying..." : "Confirm & Enter"}
              </button>
            </form>

            <button
              className="btn-text"
              onClick={() => setShowModal(false)}
              style={{ fontSize: "0.9rem", marginTop: "15px" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
