import { Common } from './common.js';

export class SceneImporter {

  static async imageToScene() {
    const templatePath = `modules/mass-import/templates/image-to-scene-dialog.html`;
    const htmlContent = await foundry.applications.handlebars.renderTemplate(templatePath, {});

    const sourceData = {
      activeSource: 'data',
      activeBucket: '',
      path: ''
    };

    // --- CARREGAR PREFERÊNCIA SALVA ---
    const lastFolder = game.user.getFlag('mass-import', 'lastSceneFolder') || '';

    // 1. Create Instance
    const dialog = new foundry.applications.api.DialogV2({
      window: { title: "Import Images/Videos to Scenes", icon: "fas fa-map" },
      content: htmlContent,
      buttons: [
        {
          action: "create",
          label: "Create Scenes",
          icon: "fas fa-check",
          default: true,
          callback: async (event, button, dialog) => {
             const html = dialog.element;
             await SceneImporter.processImport(html, sourceData);
          }
        },
        { action: "cancel", label: "Cancel", icon: "fas fa-times" }
      ]
    });

    // 2. Attach Listener explicitly
    dialog.addEventListener('render', (event) => {
        const html = dialog.element;
        
        // --- APLICAR PREFERÊNCIA NO INPUT ---
        if (lastFolder) {
            const folderInput = html.querySelector("input[name='folder-path']");
            if (folderInput) {
                folderInput.value = lastFolder;
                sourceData.path = lastFolder;
            }
        }

        // Bind FilePicker
        Common.bindFilePicker(html, ".picker-button", "input[name='folder-path']", "folder", sourceData);
        
        const range = html.querySelector("#grid_alpha");
        const rangeOut = html.querySelector(".range-value");
        if(range && rangeOut) range.addEventListener('input', e => rangeOut.textContent = e.target.value);
    });

    // 3. Render
    dialog.render(true);
  }

  static async processImport(html, sourceData) {
    const folderPath = html.querySelector("input[name='folder-path']").value;
    const folderName = html.querySelector("#folderName").value || "Imported Scenes";

    if (!folderPath) {
      ui.notifications.error("Mass Import: Please select a folder path.");
      return;
    }

    try {
      // --- SALVAR A ÚLTIMA PASTA USADA ---
      await game.user.setFlag('mass-import', 'lastSceneFolder', folderPath);

      // Find or Create Folder
      let folder = game.folders.find(f => f.name === folderName && f.type === "Scene");
      if (!folder) {
        folder = await Folder.create({ name: folderName, type: "Scene" });
      }

      const browseOptions = { bucket: sourceData.activeBucket || '' };
      
      // V13 FIX: Use namespaced FilePicker.browse
      const FilePickerClass = foundry.applications.apps.FilePicker;
      const filesResult = await FilePickerClass.browse(sourceData.activeSource, folderPath, browseOptions);
      
      if (!filesResult.files || filesResult.files.length === 0) {
        ui.notifications.warn("Mass Import: No files found in the selected folder.");
        return;
      }

      // Collect Defaults
      const defaults = {
        folder: folder.id,
        grid: {
            type: parseInt(html.querySelector("select[name='select_grid_type']").value),
            alpha: parseFloat(html.querySelector("#grid_alpha").value),
            distance: parseFloat(html.querySelector("#grid_distance").value),
            units: html.querySelector("#grid_units").value,
            size: parseInt(html.querySelector("#grid_size").value)
        },
        navigation: html.querySelector("input[name='select_navigation']").checked,
        backgroundColor: html.querySelector("#background_color").value,
        tokenVision: html.querySelector("input[name='token_vision']").checked,
        fogExploration: html.querySelector("input[name='fog_exploration']").checked
      };

      ui.notifications.info(`Mass Import: Starting import of ${filesResult.files.length} files...`);

      let count = 0;
      for (const filePath of filesResult.files) {
        const isImage = Common.isValidImage(filePath);
        const isVideo = Common.isValidVideo(filePath);

        if (!isImage && !isVideo) continue; 
        
        try {
            await SceneImporter.createScene(filePath, defaults);
            count++;
        } catch (innerErr) {
            console.error(`Mass Import | Failed to import ${filePath}:`, innerErr);
        }
      }

      if (count === 0) {
          ui.notifications.warn("Mass Import: No valid images or videos were imported.");
      } else {
          ui.notifications.info(`Mass Import: Successfully created ${count} scenes.`);
      }

    } catch (err) {
      console.error(err);
      ui.notifications.error("Mass Import: An error occurred. Check console (F12).");
    }
  }

  static async createScene(filePath, defaults) {
    // V13 FIX: Use namespaced loadTexture instead of global
    const tex = await foundry.canvas.loadTexture(filePath);
    
    // Safety check for dimensions
    const width = tex.width || 1920; 
    const height = tex.height || 1080;

    const sceneData = {
      name: Common.splitPath(filePath),
      width: width,
      height: height,
      background: { src: filePath },
      grid: { ...defaults.grid },
      padding: 0.25,
      folder: defaults.folder,
      fog: { exploration: defaults.fogExploration },
      tokenVision: defaults.tokenVision,
      backgroundColor: defaults.backgroundColor,
      navigation: defaults.navigation
    };

    return await Scene.create(sceneData);
  }
}