import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function uploadFile(file: File | null): Promise<string | null> {
  if (!file || !(file instanceof File) || file.size === 0) return null;

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    
    // Ensure directory exists
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    const uniqueName = `${crypto.randomUUID()}-${file.name.replace(/\s+/g, "-")}`;
    const filePath = path.join(uploadDir, uniqueName);
    
    await fs.writeFile(filePath, buffer);
    
    return `/uploads/${uniqueName}`;
  } catch (error) {
    console.error("File upload error:", error);
    return null;
  }
}
