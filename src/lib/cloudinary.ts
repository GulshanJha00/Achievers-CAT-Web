type UploadKind = "image" | "raw";

type CloudinaryResponse = {
  secure_url?: string;
  error?: { message?: string };
};

export async function uploadToCloudinary(file: File, kind: UploadKind) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = kind === "image"
    ? process.env.NEXT_PUBLIC_CLOUDINARY_PROFILE_PRESET
    : process.env.NEXT_PUBLIC_CLOUDINARY_MATERIALS_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary is not configured. Add the Cloudinary variables to .env.local and restart the app.");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${kind}/upload`, {
    method: "POST",
    body,
  });
  const data = await response.json() as CloudinaryResponse;

  if (!response.ok || !data.secure_url) {
    throw new Error(data.error?.message || "Cloudinary could not upload this file.");
  }

  return data.secure_url;
}
