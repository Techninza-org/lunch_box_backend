// /utils/upload.js
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

/**
 * Creates and returns a multer instance for a given folder
 * @param {string} folderName
 */
export function getMulterUpload(folderName = "misc") {
  const uploadDir = path.join(process.cwd(), "uploads", folderName);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = crypto.randomBytes(8).toString("hex");
      cb(null, uniqueName + path.extname(file.originalname));
    },
  });

  return multer({ storage });
}
