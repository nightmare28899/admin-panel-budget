export const MAX_ORIGINAL_SIZE = 5 * 1024 * 1024;
export async function readOriginalForm(request: Request): Promise<FormData> {
  return readBoundedForm(request, MAX_ORIGINAL_SIZE + 65536);
}
/** Reads a multipart body, aborting with RangeError once `limit` bytes are exceeded. */
export async function readBoundedForm(request: Request, limit: number): Promise<FormData> {
  if (!request.body) throw new Error("Choose an original file.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new RangeError("Upload exceeds the bounded multipart limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Response(bytes, {
    headers: { "Content-Type": request.headers.get("content-type") ?? "" },
  }).formData();
}
export function validateOriginal(input: { name: string; bytes: Uint8Array }): string {
  const { name, bytes } = input;
  if (!bytes.length || bytes.length > MAX_ORIGINAL_SIZE)
    throw new Error("Choose a file up to 5 MiB.");
  const extension = name.split(".").pop()?.toLowerCase();
  const starts = (values: number[]) => values.every((value, index) => bytes[index] === value);
  if (
    ["jpg", "jpeg"].includes(extension ?? "") &&
    bytes.length >= 12 &&
    starts([255, 216, 255]) &&
    bytes[bytes.length - 2] === 255 &&
    bytes[bytes.length - 1] === 217
  )
    return "image/jpeg";
  if (
    extension === "png" &&
    bytes.length >= 45 &&
    starts([137, 80, 78, 71, 13, 10, 26, 10]) &&
    new TextDecoder().decode(bytes.slice(12, 16)) === "IHDR" &&
    new TextDecoder().decode(bytes.slice(-8, -4)) === "IEND"
  )
    return "image/png";
  if (
    extension === "pdf" &&
    /^%PDF-[12]\.[0-9]/.test(new TextDecoder().decode(bytes.slice(0, 8))) &&
    new TextDecoder().decode(bytes.slice(-1024)).includes("%%EOF")
  )
    return "application/pdf";
  throw new Error("The original must be a valid JPG, PNG or PDF with a matching extension.");
}
