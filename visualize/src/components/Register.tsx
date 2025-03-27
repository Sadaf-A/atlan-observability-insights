import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Register: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!email || !password || !confirmPassword) {
            alert("All fields are required.");
            return;
        }
        if (password.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }
        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post("https://software-e-project-123.el.r.appspot.com/register", {
                email,
                password,
            });

            if (response.status === 201) {
                alert("Registration Successful! You can now log in.");

                if (response.data.token) {
                    localStorage.setItem("authToken", response.data.token);
                }

                navigate("/login");
            }
        } catch (error: any) {
            console.error("Registration error:", error.response?.data || error.message);
            alert(error.response?.data?.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={containerStyle}>
            <h2 style={titleStyle}>Register</h2>

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

            <input
                style={inputStyle}
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button style={buttonStyle} onClick={handleRegister} disabled={loading}>
                {loading ? "Registering..." : "Register"}
            </button>

            <p>
                Already have an account?{" "}
                <a href="/login" style={linkTextStyle}>
                    Login
                </a>
            </p>
        </div>
    );
};

// Define styles using React.CSSProperties
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

export default Register;
