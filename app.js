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
// CHARGER ET AFFICHER LES REPAS
// ------------------------------
async function loadMeals() {
  const { data, error } = await supabaseClient
    .from("meals")
    .select("*")
    .order("date", { ascending: false });

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
    if (!photosError && photos && Array.isArray(photos) && photos.length > 0) {
      for (const photo of photos) {
        const { data: publicUrlData } = supabaseClient.storage
          .from("meal-photos")
          .getPublicUrl(`${mealIdStr}/${photo.name}`);

        if (publicUrlData && publicUrlData.publicUrl) {
          photoUrls.push(publicUrlData.publicUrl);
        }
      }
    }

    const firstImage = photoUrls.length > 0 ? photoUrls[0] : null;

    const div = document.createElement("div");
    div.className = "meal-item";
    div.innerHTML = `
      <div class="meal-preview">
        <div class="meal-preview-content">
          <div class="meal-preview-text">
            <h3>${meal.title}</h3>
            <small>${meal.date}</small>
          </div>
          ${
            firstImage
              ? `<img src="${firstImage}" alt="Photo" class="meal-preview-img" />`
              : '<div class="meal-preview-img placeholder">No image</div>'
          }
        </div>
      </div>

      <div class="meal-detail hidden">
        <div class="meal-detail-actions">
          <button class="meal-detail-delete" onclick="deleteMeal('${
            meal.id
          }')"><img src="delete.svg" alt="Supprimer" class="delete-icon" /></button>
          <button class="meal-detail-close"><img src="arrow.svg" alt="Fermer" class="close-icon" /></button>
        </div>
        <div class="meal-detail-content">
          <h3>${meal.title}</h3>
          <small>${meal.date}</small>
          <p>${meal.description || ""}</p>
          <p><b>Ingrédients :</b> ${meal.ingredients || ""}</p>
          
          <div class="meal-gallery">
            ${photoUrls
              .map(
                (url, index) => `
              <img src="${url}" class="gallery-thumb" onclick="openModal('${url.replace(
                  /'/g,
                  "\\'"
                )}')" />
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;

    // Ajouter les event listeners après la création du DOM
    const preview = div.querySelector(".meal-preview");
    const detail = div.querySelector(".meal-detail");
    const closeBtn = div.querySelector(".meal-detail-close");

    preview.addEventListener("click", () => {
      preview.classList.add("hidden");
      detail.classList.remove("hidden");
    });

    closeBtn.addEventListener("click", () => {
      detail.classList.add("hidden");
      preview.classList.remove("hidden");
    });

    meals.appendChild(div);
  }
}

function openModal(imageUrl) {
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
    `;
    document.body.appendChild(modal);
  }

  const modalImage = document.getElementById("modal-image");
  modalImage.src = imageUrl;
  modal.classList.add("active");
}

function closeModal() {
  const modal = document.getElementById("image-modal");
  if (modal) {
    modal.classList.remove("active");
  }
}

// Charger les repas au démarrage
loadMeals();
