const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.static("uploads")); // ให้เซิร์ฟเวอร์เสิร์ฟรูปภาพที่อัปโหลด

const upload = multer({ dest: "uploads/" });

let excelData = []; // เก็บข้อมูลจาก Excel

// 📌 อัปโหลดไฟล์ Excel และอ่านข้อมูล
app.post("/upload", upload.single("file"), (req, res) => {
    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname);

    // ตรวจสอบว่าเป็นไฟล์ Excel เท่านั้น
    if (fileExt !== '.xlsx' && fileExt !== '.xls') {
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: "กรุณาอัปโหลดไฟล์ Excel เท่านั้น!" });
    }

    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        let rawData = XLSX.utils.sheet_to_json(sheet);

        // ตรวจสอบว่ามีคอลัมน์ที่จำเป็นหรือไม่
        const requiredColumns = ["Date", "CameraID", "NumHelmet", "NumNoHelmet", "Image"];
        const hasRequiredColumns = requiredColumns.every(col => rawData[0]?.hasOwnProperty(col));

        if (!hasRequiredColumns) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: "โครงสร้างไฟล์ไม่ถูกต้อง กรุณาตรวจสอบคอลัมน์!" });
        }

        // แปลงข้อมูลให้ตรงกับ API ของหน้าเว็บ
        excelData = rawData.map(item => ({
            date: item.Date || "N/A",
            camera: item.CameraID || "N/A",
            helmet: item.NumHelmet || 0,
            noHelmet: item.NumNoHelmet || 0,
            image: item.Image ? `http://localhost:3000/images/${item.Image}` : "https://via.placeholder.com/50"
        }));

        fs.unlinkSync(filePath); // ลบไฟล์ Excel หลังอ่านเสร็จ
        res.json({ message: "อัปโหลดสำเร็จ", data: excelData });

    } catch (error) {
        fs.unlinkSync(filePath);
        console.error("Error reading Excel file:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการอ่านไฟล์ Excel" });
    }
});

// 📌 API ให้หน้าเว็บดึงข้อมูล Excel
app.get("/data", (req, res) => {
    res.json(excelData);
});

// 📌 เสิร์ฟรูปภาพที่อัปโหลด
app.use("/images", express.static(path.join(__dirname, "uploads")));

// 📌 Route หน้าแรก
app.get("/", (req, res) => {
    res.send("Helmet Detection API");
});

// 📌 เริ่มต้นเซิร์ฟเวอร์
app.listen(3000, () => console.log("🚀 Server running on port 3000"));
