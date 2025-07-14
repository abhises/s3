const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const s3Routes = require("./routes/awsS3");

dotenv.config();

const app = express();

// Set body parser limits here BEFORE routes
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Register routes AFTER body parsers
app.use("/s3", s3Routes);

// Serve static files
app.use(express.static(path.join(__dirname, "/public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
