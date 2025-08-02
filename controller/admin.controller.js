import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const addbanner = async (req, res) => {
  try {
    const { title, description } = req.body;
    const image = req.file ? req.file.filename : null;

    if (!title || !description || !image) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and image are required",
      });
    }

    const img = `uploads/banners/${image.split("/").pop()}`;

    const newBanner = await prisma.banner.create({
      data: {
        title,
        description,
        image: img,
      },
    });

    res.status(201).json({
      success: true,
      message: "Banner added successfully",
      data: newBanner,
    });
  } catch (error) {
    console.error("Error adding banner:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get all banners
export const getBanners = async (req, res) => {
  try {
    const banners = await prisma.banner.findMany();
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    console.error("Error fetching banners:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get banner by ID
export const getBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await prisma.banner.findUnique({
      where: { id: Number(id) },
    });
    if (!banner) {
      return res
        .status(404)
        .json({ success: false, message: "Banner not found" });
    }
    res.status(200).json({ success: true, data: banner });
  } catch (error) {
    console.error("Error fetching banner:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Update banner
export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    let image;
    if (req.file) {
      image = `uploads/banners/${req.file.filename}`;
    }
    const data = {};
    if (title) data.title = title;
    if (description) data.description = description;
    if (image) data.image = image;
    const updated = await prisma.banner.update({
      where: { id: Number(id) },
      data,
    });
    res
      .status(200)
      .json({ success: true, message: "Banner updated", data: updated });
  } catch (error) {
    console.error("Error updating banner:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Delete banner
export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.banner.delete({ where: { id: Number(id) } });
    res.status(200).json({ success: true, message: "Banner deleted" });
  } catch (error) {
    console.error("Error deleting banner:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
