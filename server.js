const app = require("./api");

const PORT = process.env.PORT || 4892;

app.listen(PORT, () => {
  console.log(`Tibia Viewer: http://localhost:${PORT}`);
});
