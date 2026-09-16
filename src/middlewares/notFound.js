// extracted from the old inline 404 handler in index.js
import httpStateText from "../utils/httpStateText.js";

const notFound = (req, res) => {
  res.status(404).json({
    status: httpStateText[404],
    message: "Route not found",
  });
};

export default notFound;
