import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Color themes inspired by atlan
const themes = {
  light: {
    background: "#FFFFFF",
    cardBackground: "#F4F5F7",
    primary: "#0052CC",
    secondary: "#00B8D9",
    text: "#172B4D",
    inputBorder: "#DFE1E6",
    inputBackground: "#FFFFFF",
    error: "#FF5630",
    success: "#36B37E",
  },
  dark: {
    background: "#0D1117",
    cardBackground: "#161B22",
    primary: "#2684FF",
    secondary: "#00C7E6",
    text: "#F4F5F7",
    inputBorder: "#30363D",
    inputBackground: "#21262D",
    error: "#FF5630",
    success: "#36B37E",
  },
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (
      savedTheme === "dark" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      setDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    localStorage.setItem("theme", !darkMode ? "dark" : "light");
  };

  const currentTheme = darkMode ? themes.dark : themes.light;

  const handleLogin = async () => {
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("https://atlan345678.as.r.appspot.com/login", {
        email,
        password,
      });

      if (response.status === 200) {
        const { token } = response.data;
        localStorage.setItem("authToken", token);

        setErrorMessage("Login successful!");
        setTimeout(() => navigate("/dashboard"), 1000);
      }
    } catch (error: any) {
      console.error("Login error:", error.response?.data || error.message);
      setErrorMessage(
        error.response?.data?.message ||
          "Invalid credentials. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div
      style={{
        ...containerStyle,
        backgroundColor: currentTheme.background,
        color: currentTheme.text,
        transition: "all 0.3s ease",
      }}
    >
      <div
        style={{
          ...cardStyle,
          backgroundColor: currentTheme.cardBackground,
          boxShadow: `0 4px 20px rgba(0,0,0,${darkMode ? "0.4" : "0.1"})`,
        }}
      >
        <div style={headerStyle}>
          <h2
            style={{
              ...titleStyle,
              color: currentTheme.text,
            }}
          >
            Welcome Back
          </h2>
          <button
            onClick={toggleTheme}
            style={{
              ...themeToggleStyle,
              backgroundColor: "transparent",
              color: currentTheme.text,
            }}
          >
            {darkMode ? "🌞" : "🌙"}
          </button>
        </div>

        <p style={subtitleStyle}>Sign in to your account to continue</p>

        <div style={inputContainerStyle}>
          <label style={labelStyle}>Email</label>
          <input
            style={{
              ...inputStyle,
              backgroundColor: currentTheme.inputBackground,
              borderColor: currentTheme.inputBorder,
              color: currentTheme.text,
            }}
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>

        <div style={inputContainerStyle}>
          <label style={labelStyle}>Password</label>
          <input
            style={{
              ...inputStyle,
              backgroundColor: currentTheme.inputBackground,
              borderColor: currentTheme.inputBorder,
              color: currentTheme.text,
            }}
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>

        {errorMessage && (
          <div
            style={{
              ...messageStyle,
              backgroundColor: errorMessage.includes("successful")
                ? currentTheme.success
                : currentTheme.error,
              opacity: errorMessage ? 1 : 0,
            }}
          >
            {errorMessage}
          </div>
        )}

        <button
          style={{
            ...buttonStyle,
            backgroundColor: loading
              ? `${currentTheme.secondary}80`
              : currentTheme.primary,
            color: "#FFFFFF",
            transform: loading ? "scale(0.98)" : "scale(1)",
          }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>

        <p
          style={{
            marginTop: "24px",
            color: currentTheme.text,
            textAlign: "center",
            fontSize: "14px",
          }}
        >
          Don't have an account?{" "}
          <a
            href="/register"
            style={{
              color: currentTheme.primary,
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Create Account
          </a>
        </p>

        <div style={forgotPasswordStyle}>
          <a
            href="/forgot-password"
            style={{
              color: currentTheme.text,
              opacity: 0.7,
              textDecoration: "none",
              fontSize: "13px",
            }}
          >
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  width: "100%",
  transition: "background-color 0.3s ease",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "420px",
  padding: "32px",
  borderRadius: "12px",
  transition: "all 0.3s ease",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "8px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: 700,
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "14px",
  opacity: 0.8,
  marginBottom: "32px",
};

const themeToggleStyle: React.CSSProperties = {
  border: "none",
  fontSize: "20px",
  cursor: "pointer",
  padding: "8px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
};

const inputContainerStyle: React.CSSProperties = {
  marginBottom: "24px",
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "8px",
  fontSize: "14px",
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  fontSize: "16px",
  borderRadius: "8px",
  border: "1px solid",
  outline: "none",
  transition: "all 0.2s ease",
  boxSizing: "border-box",
};

const messageStyle: React.CSSProperties = {
  padding: "12px",
  borderRadius: "8px",
  color: "white",
  marginBottom: "16px",
  fontSize: "14px",
  textAlign: "center",
  transition: "all 0.3s ease",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: "bold",
  border: "none",
  cursor: "pointer",
  transition: "all 0.2s ease",
  marginTop: "8px",
};

const forgotPasswordStyle: React.CSSProperties = {
  marginTop: "16px",
  textAlign: "center",
};

export default Login;
