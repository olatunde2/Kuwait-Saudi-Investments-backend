require("dotenv").config();

module.exports = function cors() {
  const allowedOrigin = process.env.CORS_ORIGIN || "*";
  console.log(allowedOrigin);

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json",
    "Access-Control-Allow-Credentials": "true",
  };
};
