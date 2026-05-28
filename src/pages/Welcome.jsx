import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("groove_token")) {
      navigate("/home", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="screen-container fade-in">
      <h1 className="brand-title">Groove Music</h1>
      <p className="subtitle delay-1">High-fidelity audio, uncompromised.</p>
      <button
        className="btn-primary delay-2"
        onClick={() => navigate("/login")}
      >
        Enter the Experience
      </button>
    </div>
  );
}
