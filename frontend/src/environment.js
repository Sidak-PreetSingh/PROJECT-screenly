let IS_PROD = process.env.NODE_ENV === 'production';
const server = IS_PROD ?
    (process.env.REACT_APP_API_URL || "https://screenly-backend.onrender.com") :
    "http://localhost:8000"


export default server;