const express = require("express");
const router = express.Router();
const {
  getTargets,
  getTarget,
  createTarget,
  updateTarget,
  deleteTarget,
  getStats,
} = require("../controllers/targetController");
const { authMiddleware } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.use(authMiddleware);

router.get("/stats", getStats);
router.get("/", getTargets);
router.get("/:id", getTarget);
router.post("/", upload.single("gambar"), createTarget);
router.put("/:id", updateTarget);
router.delete("/:id", deleteTarget);

module.exports = router;
