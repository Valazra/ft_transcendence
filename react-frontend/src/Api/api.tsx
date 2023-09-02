import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000", // Remplacez par l'URL de votre API Nestjs
  withCredentials: true,
});

/*
api.interceptors.response.use(
    (response) => {
      callback(true);
      return response;
    },
    (error) => {
      if (error.response.status === 401) {
        callback(false);
      }
      return Promise.reject(error);
    }
  );
*/

export default api;
