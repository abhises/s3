import express from "express";
import dotenv from "dotenv";
import s3Routes from "./routes/awsS3.js";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config();

const app = express();
app.use(express.json());
app.use("/s3", s3Routes);

const PORT = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files (e.g. HTML, CSS, JS) from the "public" folder
app.use(express.static(path.join(__dirname, "/public")));

// Fallback route for index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
