export const getFilenameFromDisposition = (disposition, fallback = "respostas.pdf") => {
  const match = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(disposition ?? "");
  if (!match) return fallback;

  const rawName = match[1] ? decodeURIComponent(match[1]) : match[2];
  return rawName || fallback;
};

export const downloadBlob = (blob, filename = "respostas.pdf") => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
