/**
 * Triggers a browser download from a binary Blob.
 * @param {Blob} blob - The file content
 * @param {string} filename - The name to save the file as
 */
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};
