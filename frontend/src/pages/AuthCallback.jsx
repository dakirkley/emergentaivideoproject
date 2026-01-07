import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "../App";
import { Sparkles } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Extract session_id from URL hash
        const hash = window.location.hash;
        const sessionId = hash.split('session_id=')[1]?.split('&')[0];

        if (!sessionId) {
          console.error("No session_id found in URL");
          navigate("/", { replace: true });
          return;
        }

        // Exchange session_id for user data and session_token
        const response = await axios.get(`${API}/auth/session`, {
          headers: { "X-Session-ID": sessionId },
          withCredentials: true
        });

        const { user } = response.data;
        login(user);

        // Navigate to dashboard with user data
        navigate("/dashboard", { replace: true, state: { user } });
      } catch (error) {
        console.error("Auth callback error:", error);
        navigate("/", { replace: true });
      }
    };

    processAuth();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <Sparkles className="w-12 h-12 text-orange-500 animate-spin" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
