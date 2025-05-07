if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

module.exports = function cors() {
  const allowedOrigin = process.env.CORS_ORIGIN || "*";
  console.log("Allowed origin:", allowedOrigin);

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
  };
};

