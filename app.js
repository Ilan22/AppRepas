// ------------------------------
// CONFIGURATION SUPABASE
// ------------------------------
const supabaseUrl = "https://vhqftjhtkizimktutsbc.supabase.co"; // Remplace par ton URL
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZocWZ0amh0a2l6aW1rdHV0c2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTU2NDUsImV4cCI6MjA4MTYzMTY0NX0.Qh8aFMKcP0RgI2P864_51ZVdVZBlDVTwYfPYrKnPz0U"; // Remplace par ta clé publique
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// ------------------------------
// SELECTEURS DOM
// ------------------------------
const titleInput = document.getElementById("title");
const dateInput = document.getElementById("date");
const descriptionInput = document.getElementById("description");
const ingredientsInput = document.getElementById("ingredients");
const photosInput = document.getElementById("photos");
const meals = document.getElementById("meals");
const form = document.getElementById("meal-form");
const previewContainer = document.getElementById("preview");

let selectedFiles = []; // Stockage des fichiers sélectionnés

// ------------------------------
// CRÉER LA TEMPLATE DES REPAS
// ------------------------------
function createMealTemplate() {
  const template = document.createElement("template");
  template.id = "meal-template";
  template.innerHTML = `
    <div class="meal-item" data-meal-id="">
      <div class="meal-preview">
        <div class="meal-preview-header">
          <div class="meal-preview-info">
            <h3 class="meal-preview-title"></h3>
            <small class="meal-preview-date"></small>
          </div>
          <div class="meal-preview-img-container"></div>
        </div>
      </div>

      <div class="meal-detail hidden">
        <div class="meal-detail-header">
          <div class="meal-detail-title-section">
            <h3 class="meal-detail-title"></h3>
            <small class="meal-detail-date"></small>
          </div>
          <div class="meal-detail-actions">
            <button class="meal-detail-edit" title="Éditer">
              <img src="edit.svg" alt="Éditer" class="edit-icon" />
            </button>
            <button class="meal-detail-delete" title="Supprimer">
              <img src="delete.svg" alt="Supprimer" class="delete-icon" />
            </button>
            <button class="meal-detail-close" title="Fermer">
              <img src="arrow.svg" alt="Fermer" class="close-icon" />
            </button>
          </div>
        </div>

        <div class="meal-detail-content">
          <p class="meal-detail-description"></p>
          <p class="meal-detail-ingredients"><b>Ingrédients :</b> <span></span></p>

          <div class="meal-photos-section">
            <div class="meal-photos-header">
              <h4>Photos</h4>
              <button class="meal-add-photo-btn" title="Ajouter une photo">
                <img src="add.svg" alt="Ajouter" class="add-icon" />
              </button>
            </div>
            <div class="meal-gallery"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(template);
}

// Créer la template au démarrage
createMealTemplate();

// ------------------------------
// DATE PAR DÉFAUT = AUJOURD’HUI
// ------------------------------
dateInput.value = new Date().toISOString().split("T")[0];
// ------------------------------
// GESTION DE LA SÉLECTION D'IMAGES
// ------------------------------
photosInput.addEventListener("change", (e) => {
  // Ajouter les nouvelles images aux précédentes
  selectedFiles = [...selectedFiles, ...Array.from(e.target.files)];
  updatePreview();
  // Réinitialiser l'input pour pouvoir sélectionner à nouveau
  photosInput.value = "";
});

function updatePreview() {
  previewContainer.innerHTML = "";
  selectedFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement("div");
      div.className = "preview-item";
      div.innerHTML = `
        <img src="${e.target.result}" />
        <button type="button" class="remove-btn" onclick="removeFile(${index})">×</button>
      `;
      previewContainer.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  updatePreview();
}
// ------------------------------
// AJOUTER UN REPAS
// ------------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value;
  const date = dateInput.value;
  const description = descriptionInput.value;
  const ingredients = ingredientsInput.value;
  const files = photosInput.files;

  // 1️⃣ Ajouter le repas dans Supabase
  const { data: meal, error } = await supabaseClient
    .from("meals")
    .insert([{ title, date, description, ingredients }])
    .select()
    .single();

  if (error) {
    alert("Erreur lors de l'ajout du repas");
    console.error(error);
    return;
  }

  // 2️⃣ Upload des photos dans le dossier du meal
  if (selectedFiles.length > 0) {
    for (const file of selectedFiles) {
      const folder = meal.id.toString();
      const fileExtension = file.name.split(".").pop() || "jpg";
      const filename = crypto.randomUUID() + "." + fileExtension;
      const path = `${folder}/${filename}`;

      const { error: uploadError } = await supabaseClient.storage
        .from("meal-photos")
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Erreur upload photo :", uploadError);
      } else {
        console.log("Photo uploadée avec succès :", path);
      }
    }
    selectedFiles = [];
  }

  // 3️⃣ Reset form et recharger la liste
  form.reset();
  previewContainer.innerHTML = "";
  selectedFiles = [];
  dateInput.value = new Date().toISOString().split("T")[0];
  loadMeals();
});

// ------------------------------
// SUPPRIMER UN REPAS + SES PHOTOS
// ------------------------------
async function deleteMeal(mealId) {
  if (!confirm("Supprimer ce repas et toutes ses photos ?")) return;

  // 1️⃣ Supprimer les photos dans le bucket
  const { data: photos } = await supabaseClient.storage
    .from("meal-photos")
    .list(mealId);

  if (photos && photos.length > 0) {
    const pathsToDelete = photos.map((p) => `${mealId}/${p.name}`);
    const { error: deleteError } = await supabaseClient.storage
      .from("meal-photos")
      .remove(pathsToDelete);

    if (deleteError) console.error("Erreur suppression photos :", deleteError);
  }

  // 2️⃣ Supprimer la ligne dans la table
  const { error: mealDeleteError } = await supabaseClient
    .from("meals")
    .delete()
    .eq("id", mealId);

  if (mealDeleteError)
    console.error("Erreur suppression repas :", mealDeleteError);

  loadMeals();
}

// ------------------------------
// UPLOAD UNE PHOTO À UN REPAS EXISTANT
// ------------------------------
async function uploadMealPhoto(mealId, file) {
  const folder = mealId.toString();
  const fileExtension = file.name.split(".").pop() || "jpg";
  const filename = crypto.randomUUID() + "." + fileExtension;
  const path = `${folder}/${filename}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("meal-photos")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Erreur upload photo :", uploadError);
    alert("Erreur lors de l'upload de la photo");
  } else {
    console.log("Photo uploadée avec succès :", path);
    refreshMealGallery(mealId);
  }
}

// Rafraîchir juste la galerie photos d'un repas
async function refreshMealGallery(mealId) {
  const mealIdStr = mealId.toString();
  const { data: photos, error: photosError } = await supabaseClient.storage
    .from("meal-photos")
    .list(mealIdStr);

  const photoData = [];
  if (!photosError && photos && Array.isArray(photos) && photos.length > 0) {
    // Trier les photos par date de création (plus ancienne en premier)
    const sortedPhotos = photos.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeA - timeB;
    });

    for (const photo of sortedPhotos) {
      const { data: publicUrlData } = supabaseClient.storage
        .from("meal-photos")
        .getPublicUrl(`${mealIdStr}/${photo.name}`);

      if (publicUrlData && publicUrlData.publicUrl) {
        photoData.push({
          url: publicUrlData.publicUrl,
          filename: photo.name,
        });
      }
    }
  }

  // Trouver la galerie du repas et la mettre à jour
  const mealItem = document.querySelector(`[data-meal-id="${mealId}"]`);
  if (mealItem) {
    const galleryElement = mealItem.querySelector(".meal-gallery");
    if (galleryElement) {
      galleryElement.innerHTML = "";
      photoData.forEach((photo) => {
        const container = document.createElement("div");
        container.className = "gallery-thumb-container";

        const img = document.createElement("img");
        img.src = photo.url;
        img.className = "gallery-thumb";
        img.addEventListener("click", () => {
          openModal(
            photo.url,
            photoData.map((p) => p.url)
          );
        });

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "gallery-remove-btn";
        removeBtn.title = "Supprimer cette photo";
        removeBtn.dataset.photoFilename = photo.filename;
        removeBtn.innerHTML =
          '<img src="remove.svg" alt="Supprimer" class="remove-icon" />';
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          removeMealPhotoByFilename(mealId, removeBtn.dataset.photoFilename);
        });

        container.appendChild(img);
        container.appendChild(removeBtn);
        galleryElement.appendChild(container);
      });

      // Mettre à jour l'état du bouton ajouter photo
      updateAddPhotoButtonState(mealItem, photoData.length);
    }
  }
}

// ------------------------------
// CHARGER ET AFFICHER LES REPAS
// ------------------------------
async function loadMeals() {
  const { data, error } = await supabaseClient
    .from("meals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  meals.innerHTML = "";

  for (const meal of data) {
    const mealIdStr = meal.id.toString();
    const { data: photos, error: photosError } = await supabaseClient.storage
      .from("meal-photos")
      .list(mealIdStr);

    const photoUrls = [];
    const photoFilenames = [];
    if (!photosError && photos && Array.isArray(photos) && photos.length > 0) {
      // Trier les photos par date de création (plus ancienne en premier)
      const sortedPhotos = photos.sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeA - timeB;
      });

      for (const photo of sortedPhotos) {
        const { data: publicUrlData } = supabaseClient.storage
          .from("meal-photos")
          .getPublicUrl(`${mealIdStr}/${photo.name}`);

        if (publicUrlData && publicUrlData.publicUrl) {
          photoUrls.push(publicUrlData.publicUrl);
          photoFilenames.push(photo.name);
        }
      }
    }

    const firstImage = photoUrls.length > 0 ? photoUrls[0] : null;

    // Cloner le template
    const template = document.getElementById("meal-template");
    const mealElement = template.content.cloneNode(true);

    // Remplir les données
    const mealItem = mealElement.querySelector(".meal-item");
    mealItem.setAttribute("data-meal-id", meal.id);

    // Preview
    mealElement.querySelector(".meal-preview-title").textContent = meal.title;
    mealElement.querySelector(".meal-preview-date").textContent = meal.date;

    const previewImgContainer = mealElement.querySelector(
      ".meal-preview-img-container"
    );
    if (firstImage) {
      const img = document.createElement("img");
      img.src = firstImage;
      img.alt = "Photo";
      img.className = "meal-preview-img";
      previewImgContainer.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "meal-preview-img placeholder";
      placeholder.textContent = "No image";
      previewImgContainer.appendChild(placeholder);
    }

    // Detail
    mealElement.querySelector(".meal-detail-title").textContent = meal.title;
    mealElement.querySelector(".meal-detail-date").textContent = meal.date;
    mealElement.querySelector(".meal-detail-description").textContent =
      meal.description || "";
    mealElement.querySelector(".meal-detail-ingredients span").textContent =
      meal.ingredients || "";

    // Galerie
    const gallery = mealElement.querySelector(".meal-gallery");
    photoUrls.forEach((url, index) => {
      const container = document.createElement("div");
      container.className = "gallery-thumb-container";

      const img = document.createElement("img");
      img.src = url;
      img.className = "gallery-thumb";
      img.onclick = () => openModal(url, photoUrls);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "gallery-remove-btn";
      removeBtn.title = "Supprimer cette photo";
      removeBtn.dataset.photoFilename = photoFilenames[index];
      removeBtn.innerHTML =
        '<img src="remove.svg" alt="Supprimer" class="remove-icon" />';
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeMealPhotoByFilename(meal.id, removeBtn.dataset.photoFilename);
      };

      container.appendChild(img);
      container.appendChild(removeBtn);
      gallery.appendChild(container);
    });

    meals.appendChild(mealElement);

    // Ajouter les event listeners
    const mealDiv = meals.querySelector(`[data-meal-id="${meal.id}"]`);
    const preview = mealDiv.querySelector(".meal-preview");
    const detail = mealDiv.querySelector(".meal-detail");
    const closeBtn = mealDiv.querySelector(".meal-detail-close");
    const editBtn = mealDiv.querySelector(".meal-detail-edit");
    const deleteBtn = mealDiv.querySelector(".meal-detail-delete");
    const addPhotoBtn = mealDiv.querySelector(".meal-add-photo-btn");

    preview.addEventListener("click", () => {
      preview.classList.add("hidden");
      detail.classList.remove("hidden");
    });

    closeBtn.addEventListener("click", () => {
      detail.classList.add("hidden");
      preview.classList.remove("hidden");
    });

    editBtn.addEventListener("click", () => {
      toggleEditMode(mealDiv, meal.id, editBtn);
    });

    deleteBtn.addEventListener("click", () => {
      deleteMeal(meal.id);
    });

    addPhotoBtn.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      input.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (file) {
          await uploadMealPhoto(meal.id, file);
        }
      });

      input.click();
    });

    // Vérifier et mettre à jour l'état du bouton ajouter photo
    updateAddPhotoButtonState(mealDiv, photoUrls.length);
  }
}

// Mettre à jour l'état du bouton ajouter photo
function updateAddPhotoButtonState(mealDiv, photoCount) {
  const addPhotoBtn = mealDiv.querySelector(".meal-add-photo-btn");
  if (photoCount >= 3) {
    addPhotoBtn.disabled = true;
    addPhotoBtn.style.opacity = "0.5";
    addPhotoBtn.style.cursor = "not-allowed";
    addPhotoBtn.title = "Nombre maximum de photos atteint (3)";
  } else {
    addPhotoBtn.disabled = false;
    addPhotoBtn.style.opacity = "1";
    addPhotoBtn.style.cursor = "pointer";
    addPhotoBtn.title = "Ajouter une photo";
  }
}

// Fonction pour activer/désactiver le mode édition
function toggleEditMode(mealDiv, mealId, editBtn) {
  const titleElement = mealDiv.querySelector(".meal-detail-title");
  const dateElement = mealDiv.querySelector(".meal-detail-date");
  const descriptionElement = mealDiv.querySelector(".meal-detail-description");
  const ingredientsSpan = mealDiv.querySelector(
    ".meal-detail-ingredients span"
  );

  const isEditing = titleElement.dataset.editing === "true";

  if (isEditing) {
    // Mode: Sauvegarder et quitter l'édition
    saveEdits(mealDiv, mealId, editBtn);
  } else {
    // Mode: Activer l'édition
    enableEditMode(mealDiv, mealId, editBtn);
  }
}

function enableEditMode(mealDiv, mealId, editBtn) {
  const titleElement = mealDiv.querySelector(".meal-detail-title");
  const dateElement = mealDiv.querySelector(".meal-detail-date");
  const descriptionElement = mealDiv.querySelector(".meal-detail-description");
  const ingredientsSpan = mealDiv.querySelector(
    ".meal-detail-ingredients span"
  );

  // Créer les inputs
  const titleInput = createInput("text", titleElement.textContent);
  const dateInput = createInput("date", dateElement.textContent);
  const descriptionInput = createTextarea(descriptionElement.textContent);
  const ingredientsInput = createInput("text", ingredientsSpan.textContent);

  // Stocker les anciennes valeurs
  titleInput.dataset.oldValue = titleElement.textContent;
  dateInput.dataset.oldValue = dateElement.textContent;
  descriptionInput.dataset.oldValue = descriptionElement.textContent;
  ingredientsInput.dataset.oldValue = ingredientsSpan.textContent;

  // Remplacer les éléments par les inputs
  titleElement.replaceWith(titleInput);
  dateElement.replaceWith(dateInput);
  descriptionElement.replaceWith(descriptionInput);
  ingredientsSpan.replaceWith(ingredientsInput);

  // Marquer comme en édition
  titleInput.dataset.editing = "true";
  dateInput.dataset.editing = "true";
  descriptionInput.dataset.editing = "true";
  ingredientsInput.dataset.editing = "true";

  // Stocker les références avec les mêmes classes
  titleInput.className = "meal-detail-title";
  dateInput.className = "meal-detail-date";
  descriptionInput.className = "meal-detail-description";
  ingredientsInput.className = "ingredients-input";

  // Transformer le bouton edit en check
  const img1 = editBtn.querySelector("img");
  img1.src = "check.svg";
  img1.alt = "Valider";
  img1.className = "check-icon";
  editBtn.title = "Valider";
  editBtn.classList.add("checking");
}

function createInput(type, value) {
  const input = document.createElement("input");
  input.type = type;
  input.value = value;
  input.style.width = "100%";
  input.style.padding = "0.5rem";
  input.style.fontSize = "1rem";
  input.style.border = "2px solid var(--primary-color)";
  input.style.borderRadius = "var(--radius-md)";
  input.style.fontFamily = "inherit";
  return input;
}

function createTextarea(value) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.rows = 3;
  textarea.style.width = "100%";
  textarea.style.padding = "0.5rem";
  textarea.style.fontSize = "1rem";
  textarea.style.border = "2px solid var(--primary-color)";
  textarea.style.borderRadius = "var(--radius-md)";
  textarea.style.fontFamily = "inherit";
  return textarea;
}

async function saveEdits(mealDiv, mealId, editBtn) {
  const titleInput = mealDiv.querySelector(".meal-detail-title");
  const dateInput = mealDiv.querySelector(".meal-detail-date");
  const descriptionInput = mealDiv.querySelector(".meal-detail-description");
  const ingredientsInput = mealDiv.querySelector(".ingredients-input");

  // Récupérer les anciennes valeurs depuis les attributs data
  const oldTitle = titleInput.dataset.oldValue || "";
  const oldDate = dateInput.dataset.oldValue || "";
  const oldDescription = descriptionInput.dataset.oldValue || "";
  const oldIngredients = ingredientsInput.dataset.oldValue || "";

  const newValues = {
    title: titleInput.value,
    date: dateInput.value,
    description: descriptionInput.value,
    ingredients: ingredientsInput.value,
  };

  // Vérifier s'il y a des changements
  const hasChanges =
    oldTitle !== newValues.title ||
    oldDate !== newValues.date ||
    oldDescription !== newValues.description ||
    oldIngredients !== newValues.ingredients;

  // Si aucun changement, ne pas sauvegarder
  if (!hasChanges) {
    console.log("Aucune modification détectée");
  } else {
    // Sauvegarder dans Supabase seulement s'il y a des changements
    const { error } = await supabaseClient
      .from("meals")
      .update(newValues)
      .eq("id", mealId);

    if (error) {
      console.error("Erreur sauvegarde :", error);
      alert("Erreur lors de la sauvegarde");
      return;
    }
  }

  // Créer les nouveaux éléments
  const titleElement = document.createElement("h3");
  titleElement.className = "meal-detail-title";
  titleElement.textContent = newValues.title;

  const dateElement = document.createElement("small");
  dateElement.className = "meal-detail-date";
  dateElement.textContent = newValues.date;

  const descriptionElement = document.createElement("p");
  descriptionElement.className = "meal-detail-description";
  descriptionElement.textContent = newValues.description;

  const ingredientsSpan = document.createElement("span");
  ingredientsSpan.textContent = newValues.ingredients;

  // Remplacer les inputs par les éléments
  titleInput.replaceWith(titleElement);
  dateInput.replaceWith(dateElement);
  descriptionInput.replaceWith(descriptionElement);
  ingredientsInput.replaceWith(ingredientsSpan);

  // Mettre à jour l'aperçu aussi
  const previewTitle = mealDiv.querySelector(".meal-preview-title");
  const previewDate = mealDiv.querySelector(".meal-preview-date");
  if (previewTitle) previewTitle.textContent = newValues.title;
  if (previewDate) previewDate.textContent = newValues.date;

  // Transformer le bouton check en edit
  const img2 = editBtn.querySelector("img");
  img2.src = "edit.svg";
  img2.alt = "Éditer";
  img2.className = "edit-icon";
  editBtn.title = "Éditer";
  editBtn.classList.remove("checking");
}

// Supprimer une photo du repas par nom de fichier
async function removeMealPhotoByFilename(mealId, filename) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer cette photo ?")) {
    return;
  }

  try {
    const mealIdStr = mealId.toString();
    const path = `${mealIdStr}/${filename}`;

    const { error: deleteError } = await supabaseClient.storage
      .from("meal-photos")
      .remove([path]);

    if (deleteError) {
      console.error("Erreur suppression photo :", deleteError);
      alert("Erreur lors de la suppression de la photo");
      return;
    }

    console.log("Photo supprimée avec succès");
    refreshMealGallery(mealId);
  } catch (error) {
    console.error("Erreur :", error);
    alert("Erreur lors de la suppression");
  }
}

// Supprimer une photo du repas
async function removeMealPhoto(mealId, photoIndex, allPhotoUrls) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer cette photo ?")) {
    return;
  }

  try {
    const mealIdStr = mealId.toString();

    // Récupérer la liste des fichiers
    const { data: photos, error: listError } = await supabaseClient.storage
      .from("meal-photos")
      .list(mealIdStr);

    if (listError || !photos || photos.length === 0) {
      alert("Erreur lors de la récupération des photos");
      return;
    }

    // Supprimer le fichier correspondant
    if (photoIndex >= 0 && photoIndex < photos.length) {
      const fileToDelete = photos[photoIndex].name;
      const { error: deleteError } = await supabaseClient.storage
        .from("meal-photos")
        .remove([`${mealIdStr}/${fileToDelete}`]);

      if (deleteError) {
        console.error("Erreur suppression photo :", deleteError);
        alert("Erreur lors de la suppression de la photo");
        return;
      }

      console.log("Photo supprimée avec succès");
      refreshMealGallery(mealId);
    }
  } catch (error) {
    console.error("Erreur :", error);
    alert("Erreur lors de la suppression");
  }
}

function openModal(imageUrl, allImageUrls = []) {
  // Créer la modal si elle n'existe pas
  let modal = document.getElementById("image-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "image-modal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="closeModal()"><img src="close.svg" alt="Fermer" class="modal-close-icon" /></button>
        <img id="modal-image" src="" alt="Agrandissement" />
      </div>
      <div class="modal-thumbnails" id="modal-thumbnails"></div>
    `;
    document.body.appendChild(modal);
  }

  const modalImage = document.getElementById("modal-image");
  const thumbnailsContainer = document.getElementById("modal-thumbnails");

  modalImage.src = imageUrl;

  // Remplir les miniatures avec les images (max 3)
  thumbnailsContainer.innerHTML = "";
  if (allImageUrls.length > 0) {
    allImageUrls.forEach((url) => {
      const thumb = document.createElement("img");
      thumb.src = url;
      thumb.className = "modal-thumb";
      if (url === imageUrl) {
        thumb.classList.add("active");
      }
      thumb.addEventListener("click", () => {
        modalImage.src = url;
        document.querySelectorAll(".modal-thumb").forEach((img) => {
          img.classList.remove("active");
        });
        thumb.classList.add("active");
      });
      thumbnailsContainer.appendChild(thumb);
    });
  }

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const modal = document.getElementById("image-modal");
  if (modal) {
    modal.classList.remove("active");
  }
  document.body.style.overflow = "auto";
}

// Charger les repas au démarrage
loadMeals();
