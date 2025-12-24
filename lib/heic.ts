export async function toJpegIfHeic(file: File) {
  const isHeic =
    file.type === "image/heic" ||
    file.name.toLowerCase().endsWith(".heic");

  if (!isHeic) return file;

  // Import only in the browser to avoid "window is not defined"
  const heic2any = (await import("heic2any")).default;

  const blob = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.85,
  });

  return new File([blob as BlobPart], file.name.replace(/\.heic$/i, ".jpg"), {
    type: "image/jpeg",
  });
}
