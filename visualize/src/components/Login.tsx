import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            alert("Please enter email and password.");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post("https://software-e-project-123.el.r.appspot.com/login", {
                email,
                password,
            });

            if (response.status === 200) {
                const { token } = response.data;
                localStorage.setItem("authToken", token);
                alert("Login Successful");
                navigate("/dashboard");
            }
        } catch (error: any) {
            console.error("Login error:", error.response?.data || error.message);
            alert(error.response?.data?.message || "Invalid credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={containerStyle}>
            <h2 style={titleStyle}>Login</h2>
            <input
                style={inputStyle}
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <input
                style={inputStyle}
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button style={buttonStyle} onClick={handleLogin} disabled={loading}>
                {loading ? "Logging in..." : "Login"}
            </button>
            <p>
                Don't have an account? <a href="/register" style={linkTextStyle}>Register</a>
            </p>
        </div>
    );
};

// Define styles as React.CSSProperties
const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    padding: 20,
};

const titleStyle: React.CSSProperties = {
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "20px",
};

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    margin: "10px 0",
    border: "1px solid #ccc",
    borderRadius: "8px",
};

const buttonStyle: React.CSSProperties = {
    backgroundColor: "#007AFF",
    padding: "12px",
    borderRadius: "8px",
    color: "#FFFFFF",
    fontWeight: "bold",
    cursor: "pointer",
    width: "100%",
    border: "none",
};

const linkTextStyle: React.CSSProperties = {
    color: "#007AFF",
    marginTop: "15px",
    textDecoration: "none",
};

export default Login;
