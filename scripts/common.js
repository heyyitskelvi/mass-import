/**
 * Utility class for common operations
 */
export class Common {
  
  /**
   * Cleans a file path to return a readable name
   * @param {string} str - The file path
   * @returns {string} The cleaned name
   */
  static splitPath(str) {
    if (!str) return "";
    let imageName = str.split('\\').pop().split('/').pop(); 
    imageName = imageName.substring(0, imageName.lastIndexOf('.')) || imageName;
    imageName = imageName.replace(/[_-]/g, " ");
    return decodeURI(imageName);
  }

  /**
   * Helper to attach FilePicker to an input
   * @param {HTMLElement} html - The dialog html element
   * @param {string} triggerSelector - CSS selector for the button
   * @param {string} inputSelector - CSS selector for the input to update
   * @param {string} type - FilePicker type (folder, image, etc)
   * @param {object} sourceData - Object to store current source config
   */
  static bindFilePicker(html, triggerSelector, inputSelector, type, sourceData) {
    const button = html.querySelector(triggerSelector);
    const input = html.querySelector(inputSelector);

    if (!button) {
        console.error(`Mass Import | Button not found for selector: ${triggerSelector}`);
        return;
    }
    if (!input) {
        console.error(`Mass Import | Input not found for selector: ${inputSelector}`);
        return;
    }

    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      // V13 FIX: Use namespaced FilePicker instead of global to avoid deprecation warning
      const FilePickerClass = foundry.applications.apps.FilePicker;

      const fp = new FilePickerClass({
        type: type,
        current: input.value,
        callback: (path) => {
          input.value = path;
          // Check static property on the correct class
          if (sourceData && FilePickerClass.lastBrowse) {
             sourceData.activeSource = FilePickerClass.lastBrowse.source;
             sourceData.activeBucket = FilePickerClass.lastBrowse.bucket;
             sourceData.path = path;
          }
        }
      });
      fp.render(true);
    };
  }
}

Common.isValidImage = function(path) {
    return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(path);
};

Common.isValidPDF = function(path) {
    return /\.pdf$/i.test(path);
};

Common.isValidVideo = function(path) {
    return /\.(webm|mp4|m4v|ogg)$/i.test(path);
};