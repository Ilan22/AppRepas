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

// Bouton pour effacer le formulaire
const clearFormBtn = document.getElementById("clear-form-btn");

// Sélecteurs pour les idées
const ideaTitleInput = document.getElementById("idea-title");
const ideaDescriptionInput = document.getElementById("idea-description");
const ideaLinkInput = document.getElementById("idea-link");
const ideaAuthorInput = document.getElementById("idea-author");
const ideasList = document.getElementById("ideas-list");
const ideaForm = document.getElementById("idea-form");

let selectedFiles = []; // Stockage des fichiers sélectionnés

// ========================================
// SYSTÈME DE FILTRES
// ========================================
let filterState = {
  sortBy: "name", // "date" ou "name"
  sortOrder: "asc", // "asc" ou "desc"
};

let allMeals = []; // Stocker tous les repas pour les trier

// ========================================
// FONCTION DE FORMATAGE DES DATES
// ========================================
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = date.getDate();
  const monthNames = [
    "jan",
    "fév",
    "mar",
    "avr",
    "mai",
    "juin",
    "juil",
    "aoû",
    "sep",
    "oct",
    "nov",
    "déc",
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

// ========================================
// FONCTION POUR CONVERTIR LES URLS EN LIENS
// ========================================
function linkifyText(text) {
  if (!text) return text;

  // Regex pour détecter les URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  const container = document.createElement("span");
  parts.forEach((part) => {
    if (urlRegex.test(part)) {
      const link = document.createElement("a");
      link.href = part;
      link.textContent = part;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.style.color = "var(--primary-color)";
      link.style.textDecoration = "underline";
      link.style.cursor = "pointer";
      container.appendChild(link);
    } else {
      container.appendChild(document.createTextNode(part));
    }
  });

  return container;
}

// ========================================
// FONCTION DE TRI DES REPAS
// ========================================
function sortMeals(meals) {
  const sorted = [...meals]; // Copier le tableau

  if (filterState.sortBy === "name") {
    // Trier par nom
    sorted.sort((a, b) => {
      const comp = a.title.localeCompare(b.title, "fr");
      return filterState.sortOrder === "asc" ? comp : -comp;
    });
  } else if (filterState.sortBy === "date") {
    // Trier par date du repas (champ 'date'), pas par created_at
    sorted.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return filterState.sortOrder === "asc" ? timeB - timeA : timeA - timeB;
    });
  } else if (filterState.sortBy === "counter") {
    // Trier par compteur
    sorted.sort((a, b) => {
      const counterA = a.counter || 0;
      const counterB = b.counter || 0;
      return filterState.sortOrder === "asc"
        ? counterA - counterB
        : counterB - counterA;
    });
  }

  return sorted;
}

// ========================================
// SYSTÈME DE PAGES
// ========================================
let currentPage = "meals"; // Page par défaut

function navigateTo(page) {
  // Cacher toutes les pages
  document.querySelectorAll(".page").forEach((p) => {
    p.classList.remove("active");
  });

  // Afficher la page demandée
  const pageElement = document.getElementById(`page-${page}`);
  if (pageElement) {
    pageElement.classList.add("active");
    currentPage = page;
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Si on va à la page d'ajout, mettre à jour l'état du bouton
    if (page === "add") {
      updateAddPhotoButtonFormState();
    }
  }
}

// ------------------------------
// CRÉER LA TEMPLATE DES REPAS
// ------------------------------
// ========================================
// GESTION DES IDÉES
// ========================================

// Charger et afficher les idées
async function loadIdeas() {
  const { data, error } = await supabaseClient
    .from("ideas")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  ideasList.innerHTML = "";

  if (data.length === 0) {
    ideasList.innerHTML =
      '<div class="idea-empty">Aucune idée pour le moment</div>';
    return;
  }

  data.forEach((idea) => {
    const ideaDiv = document.createElement("div");
    ideaDiv.className = "idea-item";
    ideaDiv.setAttribute("data-idea-id", idea.id);

    let content = `<div class="idea-header">
      <h3 class="idea-title">${idea.title}`;

    if (idea.author) {
      content += `<span class="idea-author-chip">${idea.author}</span>`;
    }

    content += `</h3>
      <button class="idea-delete-btn" type="button" title="Supprimer">✕</button>
    </div>`;

    if (idea.description) {
      content += `<p class="idea-description">${idea.description}</p>`;
    }

    if (idea.link) {
      try {
        const domain = new URL(idea.link).hostname
          .replace(/^www\./, "")
          .split(".")[0];
        content += `<a href="${idea.link}" target="_blank" rel="noopener noreferrer" class="idea-link">${domain}</a>`;
      } catch (e) {
        content += `<a href="${idea.link}" target="_blank" rel="noopener noreferrer" class="idea-link">Voir le lien</a>`;
      }
    }

    ideaDiv.innerHTML = content;

    const deleteBtn = ideaDiv.querySelector(".idea-delete-btn");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteIdea(idea.id);
    });

    // Rendre l'idée cliquable pour créer un repas pré-rempli
    ideaDiv.addEventListener("click", () => {
      // Pré-remplir le formulaire
      document.getElementById("title").value = idea.title;

      // Date du jour
      const today = new Date().toISOString().split("T")[0];
      document.getElementById("date").value = today;

      // Description pré-remplie
      let description = "";
      if (idea.description) {
        description += idea.description + "\n\n";
      }
      if (idea.link) {
        description += idea.link + "\n\n";
      }
      if (idea.author) {
        description += idea.author;
      }
      document.getElementById("description").value = description;

      // Naviguer vers la page d'ajout
      navigateTo("add");
    });

    ideasList.appendChild(ideaDiv);
  });
}

// Supprimer une idée
async function deleteIdea(ideaId) {
  if (!confirm("Supprimer cette idée ?")) return;

  const { error } = await supabaseClient
    .from("ideas")
    .delete()
    .eq("id", ideaId);

  if (error) {
    console.error("Erreur suppression idée :", error);
    alert("Erreur lors de la suppression");
    return;
  }

  loadIdeas();
}

// Ajouter une idée
async function addIdea(event) {
  event.preventDefault();

  const title = ideaTitleInput.value.trim();
  const description = ideaDescriptionInput.value.trim();
  const link = ideaLinkInput.value.trim();
  const author = ideaAuthorInput.value.trim();

  if (!title) {
    alert("Le titre est obligatoire");
    return;
  }

  if (!author) {
    alert("Veuillez choisir un auteur");
    return;
  }

  const { data, error } = await supabaseClient
    .from("ideas")
    .insert([
      { title, description: description || null, link: link || null, author },
    ]);

  if (error) {
    console.error(error);
    alert("Erreur lors de l'ajout de l'idée");
    return;
  }

  // Réinitialiser le formulaire
  ideaForm.reset();

  // Recharger les idées
  loadIdeas();
}

// Event listener pour le formulaire des idées
if (ideaForm) {
  ideaForm.addEventListener("submit", addIdea);
}

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
            <div class="meal-preview-counter">Fait <span class="counter-value">0</span>x</div>
          </div>
          <div class="meal-preview-img-container"></div>
        </div>
      </div>

      <div class="meal-detail hidden">
        <div class="meal-detail-header">
          <div class="meal-detail-title-section">
            <h3 class="meal-detail-title"></h3>
            <small class="meal-detail-date"></small>
            <div class="meal-detail-counter">Fait <span class="counter-value">0</span>x</div>
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

            <div class="meal-counter-buttons">
              <button class="meal-counter-btn meal-counter-minus" title="Moins">
                <img src="remove.svg" alt="Moins" class="counter-icon" />
              </button>
              <button class="meal-counter-btn meal-counter-plus" title="Plus">
                <img src="add.svg" alt="Plus" class="counter-icon" />
              </button>
            </div>
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
  updateAddPhotoButtonFormState();
  // Réinitialiser l'input pour pouvoir sélectionner à nouveau
  photosInput.value = "";
});

function updatePreview() {
  previewContainer.innerHTML = "";
  selectedFiles.forEach((file, index) => {
    const div = document.createElement("div");
    div.className = "preview-item";

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => removeFile(index));

    div.appendChild(img);
    div.appendChild(removeBtn);
    previewContainer.appendChild(div);
  });
}

function updateAddPhotoButtonFormState() {
  const fileInputLabel = document.querySelector(".file-input-label");
  const photosInput = document.getElementById("photos");
  const submitBtn = form.querySelector("button[type='submit']");

  // Toujours actif - pas de limite
  fileInputLabel.style.opacity = "1";
  fileInputLabel.style.cursor = "pointer";
  fileInputLabel.style.pointerEvents = "auto";
  photosInput.disabled = false;
  document.querySelector(".file-input-text").textContent =
    "+ Ajouter des photos";

  // Bouton soumettre désactivé s'il n'y a pas de photos
  const errorMessage = document.getElementById("photo-error-message");
  if (selectedFiles.length === 0) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.5";
    submitBtn.style.cursor = "not-allowed";
    submitBtn.title = "Veuillez ajouter au moins une photo";
    if (errorMessage) {
      errorMessage.classList.add("visible");
    }
  } else {
    submitBtn.disabled = false;
    submitBtn.style.opacity = "1";
    submitBtn.style.cursor = "pointer";
    submitBtn.title = "Ajouter ce repas";
    if (errorMessage) {
      errorMessage.classList.remove("visible");
    }
  }
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  updatePreview();
  updateAddPhotoButtonFormState();
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
  updateAddPhotoButtonFormState();
  loadMeals();

  // Rediriger vers la page Repas
  navigateTo("meals");
});

// Événement pour le bouton effacer le formulaire
if (clearFormBtn) {
  clearFormBtn.addEventListener("click", (e) => {
    e.preventDefault();
    form.reset();
    previewContainer.innerHTML = "";
    selectedFiles = [];
    photosInput.value = "";
    dateInput.value = new Date().toISOString().split("T")[0];
    updateAddPhotoButtonFormState();
  });
}

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
  const { data, error } = await supabaseClient.from("meals").select("*");

  if (error) {
    console.error(error);
    return;
  }

  // Stocker les repas originaux avec les photos
  allMeals = [];

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

    // Ajouter les photos aux données du repas
    meal.photoUrls = photoUrls;
    meal.photoFilenames = photoFilenames;
    allMeals.push(meal);
  }

  // Trier les repas selon le filtre actuel
  const sortedMeals = sortMeals(allMeals);

  // Utiliser renderMeals pour le rendu (avec groupement par lettre si nom)
  await renderMeals(sortedMeals);
}

// Mettre à jour l'état du bouton ajouter photo
function updateAddPhotoButtonState(mealDiv, photoCount) {
  const addPhotoBtn = mealDiv.querySelector(".meal-add-photo-btn");
  // Bouton toujours actif - pas de limite
  addPhotoBtn.disabled = false;
  addPhotoBtn.style.opacity = "1";
  addPhotoBtn.style.cursor = "pointer";
  addPhotoBtn.title = "Ajouter une photo";
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
  const dateInput = createInput(
    "date",
    dateElement.dataset.date || dateElement.textContent
  );
  const descriptionInput = createTextarea(descriptionElement.textContent);
  const ingredientsInput = createInput("text", ingredientsSpan.textContent);

  // Stocker les anciennes valeurs
  titleInput.dataset.oldValue = titleElement.textContent;
  dateInput.dataset.oldValue =
    dateElement.dataset.date || dateElement.textContent;
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
  input.style.background = "var(--bg-card)";
  input.style.color = "var(--text-primary)";
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
  textarea.style.background = "var(--bg-card)";
  textarea.style.color = "var(--text-primary)";
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
  dateElement.textContent = formatDate(newValues.date);
  dateElement.dataset.date = newValues.date;

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
  if (previewDate) previewDate.textContent = formatDate(newValues.date);

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

// ========================================
// MISE À JOUR DU COMPTEUR EN BDD
// ========================================
async function updateCounterInDB(mealId, newCounter) {
  const { error } = await supabaseClient
    .from("meals")
    .update({ counter: newCounter })
    .eq("id", mealId);

  if (error) {
    console.error("Erreur lors de la mise à jour du compteur:", error);
  }
}

// ========================================
// FONCTION DE RENDU DES REPAS (sans appel BDD)
// ========================================
async function renderMeals(mealsToRender) {
  meals.innerHTML = "";

  // Si aucun repas, afficher le message vide
  if (mealsToRender.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = "<p>Pas encore de repas</p>";
    meals.appendChild(emptyState);
    return;
  }

  // Grouper par première lettre si le filtre est par nom, par date si par date
  let groupByLetter = filterState.sortBy === "name";
  let groupByDate = filterState.sortBy === "date";

  // Déterminer s'il faut afficher les titres de groupement (lettre ou date)
  let currentGroupKey = null;

  for (const meal of mealsToRender) {
    const mealIdStr = meal.id.toString();
    const photoUrls = meal.photoUrls || [];
    const photoFilenames = meal.photoFilenames || [];

    // Ajouter le titre du groupe (lettre ou date) si le groupe change
    if (groupByLetter) {
      const firstLetter = (meal.title.charAt(0) || "").toUpperCase();
      if (firstLetter !== currentGroupKey) {
        currentGroupKey = firstLetter;
        const letterTitle = document.createElement("div");
        letterTitle.className = "meals-letter-title";
        letterTitle.textContent = currentGroupKey;
        meals.appendChild(letterTitle);
      }
    } else if (groupByDate) {
      // Formater la date en "Mois Année" (ex: "Décembre 2025")
      const dateObj = new Date(meal.date);
      const monthYear = dateObj.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      });
      const capitalizedMonthYear =
        monthYear.charAt(0).toUpperCase() + monthYear.slice(1);

      if (capitalizedMonthYear !== currentGroupKey) {
        currentGroupKey = capitalizedMonthYear;
        const dateTitle = document.createElement("div");
        dateTitle.className = "meals-letter-title";
        dateTitle.textContent = currentGroupKey;
        meals.appendChild(dateTitle);
      }
    }
    // Pas de groupement si on trie par compteur

    const firstImage = photoUrls.length > 0 ? photoUrls[0] : null;

    // Cloner le template
    const template = document.getElementById("meal-template");
    const mealElement = template.content.cloneNode(true);

    // Remplir les données
    const mealItem = mealElement.querySelector(".meal-item");
    mealItem.setAttribute("data-meal-id", meal.id);

    // Preview
    mealElement.querySelector(".meal-preview-title").textContent = meal.title;
    mealElement.querySelector(".meal-preview-date").textContent = formatDate(
      meal.date
    );
    mealElement.querySelector(
      ".meal-preview-counter .counter-value"
    ).textContent = meal.counter || 0;

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
    const dateElem = mealElement.querySelector(".meal-detail-date");
    dateElem.textContent = formatDate(meal.date);
    dateElem.dataset.date = meal.date; // Stocker la vraie date
    mealElement.querySelector(
      ".meal-detail-counter .counter-value"
    ).textContent = meal.counter || 0;
    const descriptionElem = mealElement.querySelector(
      ".meal-detail-description"
    );
    descriptionElem.innerHTML = "";
    if (meal.description) {
      descriptionElem.appendChild(linkifyText(meal.description));
    }
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

    closeBtn.addEventListener("click", async () => {
      detail.classList.add("hidden");
      preview.classList.remove("hidden");
      // Si le tri actuel est par compteur, re-trier et re-rendre
      if (filterState.sortBy === "counter") {
        const sortedMeals = sortMeals(allMeals);
        await renderMeals(sortedMeals);
      }
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
      input.multiple = true;

      input.addEventListener("change", async (e) => {
        const files = Array.from(e.target.files);

        // Uploader toutes les photos sélectionnées
        for (const file of files) {
          await uploadMealPhoto(meal.id, file);
        }
      });

      input.click();
    });

    // Event listeners pour les boutons du compteur
    const minusBtn = mealDiv.querySelector(".meal-counter-minus");
    const plusBtn = mealDiv.querySelector(".meal-counter-plus");

    const updateCounterDisplay = () => {
      const currentValue = meal.counter || 1;
      mealDiv.querySelector(".meal-detail-counter .counter-value").textContent =
        currentValue;
      // Mettre à jour aussi la preview
      const previewCounter = mealDiv.querySelector(
        ".meal-preview-counter .counter-value"
      );
      if (previewCounter) {
        previewCounter.textContent = currentValue;
      }
      minusBtn.disabled = currentValue === 1;
    };

    if (minusBtn) {
      minusBtn.addEventListener("click", async () => {
        if (meal.counter > 1) {
          meal.counter--;
          await updateCounterInDB(meal.id, meal.counter);
          updateCounterDisplay();
        }
      });
    }

    if (plusBtn) {
      plusBtn.addEventListener("click", async () => {
        meal.counter = (meal.counter || 1) + 1;
        await updateCounterInDB(meal.id, meal.counter);
        updateCounterDisplay();
      });
    }

    // Initialiser l'état du bouton moins
    updateCounterDisplay();

    // Vérifier et mettre à jour l'état du bouton ajouter photo
    updateAddPhotoButtonState(mealDiv, photoUrls.length);
  }
}

// ========================================
// MISE À JOUR UI DES BOUTONS DE FILTRE
// ========================================
function updateFilterButtonsUI() {
  const nameBtn = document.getElementById("filter-name-btn");
  const dateBtn = document.getElementById("filter-date-btn");
  const counterBtn = document.getElementById("filter-counter-btn");

  // Réinitialiser tous les boutons
  nameBtn.classList.remove("active");
  dateBtn.classList.remove("active");
  counterBtn.classList.remove("active");

  // Mettre à jour l'icône et la classe active selon le filtre
  // Réinitialiser toutes les icônes
  nameBtn.querySelector(".filter-icon").textContent = "↑↓";
  dateBtn.querySelector(".filter-icon").textContent = "↑↓";
  counterBtn.querySelector(".filter-icon").textContent = "↑↓";

  if (filterState.sortBy === "name") {
    nameBtn.classList.add("active");
    const icon = nameBtn.querySelector(".filter-icon");
    icon.textContent = filterState.sortOrder === "asc" ? "↑" : "↓";
  } else if (filterState.sortBy === "date") {
    dateBtn.classList.add("active");
    const icon = dateBtn.querySelector(".filter-icon");
    icon.textContent = filterState.sortOrder === "asc" ? "↑" : "↓";
  } else if (filterState.sortBy === "counter") {
    counterBtn.classList.add("active");
    const icon = counterBtn.querySelector(".filter-icon");
    icon.textContent = filterState.sortOrder === "asc" ? "↑" : "↓";
  }
}

// Charger les repas et les idées au démarrage
let ideasLoaded = false;
loadMeals();
updateFilterButtonsUI();

// ========================================
// NAVIGATION EN BAS - BOTTOM NAV
// ========================================

// Récupérer les boutons du menu
const navMealsBtn = document.getElementById("nav-meals");
const navAddBtn = document.getElementById("nav-add");
const navIdeasBtn = document.getElementById("nav-ideas");

if (navMealsBtn) {
  navMealsBtn.addEventListener("click", () => {
    navigateTo("meals");
  });
}

if (navAddBtn) {
  navAddBtn.addEventListener("click", () => {
    navigateTo("add");
  });
}

if (navIdeasBtn) {
  navIdeasBtn.addEventListener("click", () => {
    if (!ideasLoaded) {
      loadIdeas();
      ideasLoaded = true;
    }
    navigateTo("ideas");
  });
}

// ========================================
// EVENT LISTENERS POUR LES BOUTONS DE FILTRE
// ========================================

const filterNameBtn = document.getElementById("filter-name-btn");
const filterDateBtn = document.getElementById("filter-date-btn");
const filterCounterBtn = document.getElementById("filter-counter-btn");

if (filterNameBtn) {
  filterNameBtn.addEventListener("click", async () => {
    if (filterState.sortBy === "name") {
      // Basculer l'ordre
      filterState.sortOrder = filterState.sortOrder === "asc" ? "desc" : "asc";
    } else {
      // Changer vers tri par nom, ordre normal
      filterState.sortBy = "name";
      filterState.sortOrder = "asc";
    }
    // Trier et réafficher les repas sans appel BDD
    const sortedMeals = sortMeals(allMeals);
    await renderMeals(sortedMeals);
    updateFilterButtonsUI();
  });
}

if (filterDateBtn) {
  filterDateBtn.addEventListener("click", async () => {
    if (filterState.sortBy === "date") {
      // Basculer l'ordre
      filterState.sortOrder = filterState.sortOrder === "desc" ? "asc" : "desc";
    } else {
      // Changer vers tri par date, ordre ancien en premier
      filterState.sortBy = "date";
      filterState.sortOrder = "asc";
    }
    // Trier et réafficher les repas sans appel BDD
    const sortedMeals = sortMeals(allMeals);
    await renderMeals(sortedMeals);
    updateFilterButtonsUI();
  });
}

if (filterCounterBtn) {
  filterCounterBtn.addEventListener("click", async () => {
    if (filterState.sortBy === "counter") {
      // Basculer l'ordre
      filterState.sortOrder = filterState.sortOrder === "asc" ? "desc" : "asc";
    } else {
      // Changer vers tri par compteur, ordre croissant par défaut
      filterState.sortBy = "counter";
      filterState.sortOrder = "asc";
    }
    // Trier et réafficher les repas sans appel BDD
    const sortedMeals = sortMeals(allMeals);
    await renderMeals(sortedMeals);
    updateFilterButtonsUI();
  });
}
