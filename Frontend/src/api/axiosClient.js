import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use((config) => {
  const session = localStorage.getItem("dfms_auth");
  if (session) {
    const parsed = JSON.parse(session);
    if (parsed?.accessToken) {
      config.headers.Authorization = `Bearer ${parsed.accessToken}`;
    }
  }
  return config;
});

export default axiosClient;